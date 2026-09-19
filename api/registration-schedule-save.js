import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';

export const access='member';
export const methods=['POST'];

export default async function(req,res){
  const a=await requireManager(req,res);
  if(!a)return;

  const {registration_id,occurrences=[]}=req.body||{};
  if(!registration_id)return res.status(400).json({error:'Registration ID is required'});

  const r=await db.query(`SELECT pr.id,pr.player_id,pr.package_id,pr.sessions_per_week,pr.start_date,pr.number_weeks,pr.sport AS sport,pr.tennis_categories
    FROM player_registrations pr WHERE pr.id=$1 LIMIT 1`,[registration_id]);
  if(!r.rows.length)return res.status(404).json({error:'Registration not found'});
  const reg=r.rows[0];
  if(!Array.isArray(occurrences))return res.status(400).json({error:'Occurrences must be a list'});

  const clean=[];
  for(const x of occurrences){
    const session_id=String(x.session_id||'');
    const session_date=String(x.session_date||'');
    if(!session_id||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(session_date))
      return res.status(400).json({error:'Each slot needs a valid session and date'});
    clean.push({session_id,session_date});
  }

  const unique=[];
  const seen=new Set();
  for(const x of clean){
    const k=x.session_id+'|'+x.session_date;
    if(!seen.has(k)){seen.add(k);unique.push(x)}
  }

  // Fetch all selected sessions in ONE query. The previous implementation made
  // one DB query per selected slot, which could exceed the project DB rate limit.
  const sessionIds=[...new Set(unique.map(x=>x.session_id))];
  const sessionMap=new Map();
  if(sessionIds.length){
    const q=await db.query(
      'SELECT id,sport,day_of_week,start_time,start_date,end_date,tennis_categories,location FROM academy_sessions WHERE id=ANY($1::uuid[])',
      [sessionIds]
    );
    for(const s of q.rows)sessionMap.set(String(s.id),s);
    if(sessionMap.size!==sessionIds.length)return res.status(400).json({error:'One selected session no longer exists'});
  }

  const regEnd=new Date(reg.start_date+'T00:00:00');
  regEnd.setDate(regEnd.getDate()+Math.max(1,Number(reg.number_weeks||1))*7-1);
  const regEndIso=regEnd.toISOString().slice(0,10);
  const playerCategories=Array.isArray(reg.tennis_categories)?reg.tennis_categories:[];

  for(const x of unique){
    const s=sessionMap.get(x.session_id);
    if(!s)return res.status(400).json({error:'One selected session no longer exists'});
    if(s.sport!==reg.sport)return res.status(400).json({error:'Selected slot sport does not match the registration'});
    const d=new Date(x.session_date+'T00:00:00');
    if(Number.isNaN(d.getTime()))return res.status(400).json({error:'Invalid session date'});
    if((s.start_date&&x.session_date<s.start_date)||(s.end_date&&x.session_date>s.end_date))
      return res.status(400).json({error:'A selected slot is outside its active dates'});
    if(d.getDay()!==Number(s.day_of_week))return res.status(400).json({error:'A selected date does not match the slot day'});
    if(reg.start_date&&x.session_date<reg.start_date)return res.status(400).json({error:'A selected slot is before the registration start date'});
    if(x.session_date>regEndIso)return res.status(400).json({error:'A selected slot is after the registration period'});
    if(reg.sport==='Tennis'){
      const sc=Array.isArray(s.tennis_categories)?s.tennis_categories:[];
      if(!sc.some(c=>playerCategories.includes(c)))
        return res.status(400).json({error:'A selected tennis slot does not match the player category'});
    }
  }

  const weekCounts={};
  for(const x of unique){
    const d=new Date(x.session_date+'T00:00:00');
    const key=new Date(d);
    key.setDate(d.getDate()-d.getDay());
    const wk=key.toISOString().slice(0,10);
    weekCounts[wk]=(weekCounts[wk]||0)+1;
    if(weekCounts[wk]>Number(reg.sessions_per_week||1))
      return res.status(400).json({error:'Too many slots selected in one week. This registration allows '+reg.sessions_per_week+' per week.'});
  }

  // Replace this registration's schedule using batched DB writes so large
  // recurring selections do not hit the project DB rate limit.
  const oldSlots=await db.query('SELECT session_id FROM player_registration_slots WHERE registration_id=$1',[registration_id]);
  const oldSessionIds=[...new Set(oldSlots.rows.map(x=>String(x.session_id)))];

  await db.query('DELETE FROM player_schedule_occurrences WHERE registration_id=$1',[registration_id]);
  await db.query('DELETE FROM player_registration_slots WHERE registration_id=$1',[registration_id]);

  if(oldSessionIds.length){
    await db.query(
      'DELETE FROM session_players WHERE player_id=$1 AND session_id=ANY($2::uuid[]) AND NOT EXISTS (SELECT 1 FROM player_registration_slots WHERE player_id=$1 AND session_id=session_players.session_id)',
      [reg.player_id,oldSessionIds]
    );
  }

  if(unique.length){
    const slotValues=[];
    const slotParams=[reg.player_id,registration_id];
    const occValues=[];
    const occParams=[reg.player_id,registration_id];
    unique.forEach((x,i)=>{
      // Slots have one variable binding per row: player_id, session_id, registration_id.
      // Keep the session_id placeholders contiguous: $3, $4, $5, ...
      const p=3+i;
      slotValues.push(`($1,$${p},$2)`);
      slotParams.push(x.session_id);

      // Occurrences have two variable bindings per row: session_id and session_date.
      const o=3+i*2;
      occValues.push(`($1,$${o},$${o+1},'Pending',$2)`);
      occParams.push(x.session_id,x.session_date);
    });

    await db.query(
      `INSERT INTO player_registration_slots(player_id,session_id,registration_id) VALUES ${slotValues.join(',')} ON CONFLICT DO NOTHING`,
      slotParams
    );
    await db.query(
      `INSERT INTO player_schedule_occurrences(player_id,session_id,session_date,status,registration_id) VALUES ${occValues.join(',')}
       ON CONFLICT(player_id,session_id,session_date) DO UPDATE SET registration_id=EXCLUDED.registration_id`,
      occParams
    );

    const sessionSet=[...new Set(unique.map(x=>x.session_id))];
    await db.query(
      'INSERT INTO session_players(session_id,player_id) SELECT unnest($1::uuid[]),$2 ON CONFLICT DO NOTHING',
      [sessionSet,reg.player_id]
    );
  }

  res.json({ok:true,registration_id,player_id:reg.player_id,selected_slots:unique.length,sessions:[...new Set(unique.map(x=>x.session_id))]});
}