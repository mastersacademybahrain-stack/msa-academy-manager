import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';

export const access='member';
export const methods=['POST'];

export default async function(req,res){
  const a=await requireManager(req,res);
  if(!a)return;
  const {registration_id,occurrences=[]}=req.body||{};
  if(!registration_id)return res.status(400).json({error:'Registration ID is required'});
  const r=await db.query(`SELECT pr.id,pr.player_id,pr.package_id,pr.sessions_per_week,pr.start_date,pr.number_weeks,p.sport,p.tennis_categories
    FROM player_registrations pr JOIN players p ON p.id=pr.player_id WHERE pr.id=$1 LIMIT 1`,[registration_id]);
  if(!r.rows.length)return res.status(404).json({error:'Registration not found'});
  const reg=r.rows[0];
  if(!Array.isArray(occurrences))return res.status(400).json({error:'Occurrences must be a list'});

  const clean=[];
  for(const x of occurrences){
    const session_id=String(x.session_id||'');
    const session_date=String(x.session_date||'');
    if(!session_id||!/^\\d{4}-\\d{2}-\\d{2}$/.test(session_date))return res.status(400).json({error:'Each slot needs a valid session and date'});
    const q=await db.query('SELECT id,sport,day_of_week,start_time,start_date,end_date,tennis_categories,location FROM academy_sessions WHERE id=$1 LIMIT 1',[session_id]);
    if(!q.rows.length)return res.status(400).json({error:'One selected session no longer exists'});
    const s=q.rows[0];
    if(s.sport!==reg.sport)return res.status(400).json({error:'Selected slot sport does not match the player'});
    const d=new Date(session_date+'T00:00:00');
    if(Number.isNaN(d.getTime()))return res.status(400).json({error:'Invalid session date'});
    if(s.start_date&&session_date<s.start_date || s.end_date&&session_date>s.end_date)return res.status(400).json({error:'A selected slot is outside its active dates'});
    if(d.getDay()!==Number(s.day_of_week))return res.status(400).json({error:'A selected date does not match the slot day'});
    if(reg.start_date&&session_date<reg.start_date)return res.status(400).json({error:'A selected slot is before the registration start date'});
    const end=new Date(reg.start_date+'T00:00:00');
    end.setDate(end.getDate()+Math.max(1,Number(reg.number_weeks||1))*7-1);
    const endIso=end.toISOString().slice(0,10);
    if(session_date>endIso)return res.status(400).json({error:'A selected slot is after the registration period'});
    if(reg.sport==='Tennis'){
      const pc=Array.isArray(reg.tennis_categories)?reg.tennis_categories:[];
      const sc=Array.isArray(s.tennis_categories)?s.tennis_categories:[];
      if(!sc.some(x=>pc.includes(x)))return res.status(400).json({error:'A selected tennis slot does not match the player category'});
    }
    clean.push({session_id,session_date});
  }

  const unique=[];
  const seen=new Set();
  for(const x of clean){
    const k=x.session_id+'|'+x.session_date;
    if(!seen.has(k)){seen.add(k);unique.push(x)}
  }
  const weekCounts={};
  for(const x of unique){
    const d=new Date(x.session_date+'T00:00:00');
    const key=new Date(d);
    key.setDate(d.getDate()-d.getDay());
    const wk=key.toISOString().slice(0,10);
    weekCounts[wk]=(weekCounts[wk]||0)+1;
    if(weekCounts[wk]>Number(reg.sessions_per_week||1))return res.status(400).json({error:'Too many slots selected in one week. This registration allows '+reg.sessions_per_week+' per week.'});
  }

  // Replace this registration's schedule completely with the current checked list.
  // This deliberately supports zero selections: unticking every slot clears the registration schedule.
  const oldSlots=await db.query('SELECT session_id FROM player_registration_slots WHERE registration_id=$1',[registration_id]);
  await db.query('DELETE FROM player_schedule_occurrences WHERE registration_id=$1',[registration_id]);
  await db.query('DELETE FROM player_registration_slots WHERE registration_id=$1',[registration_id]);
  for(const row of oldSlots.rows){
    await db.query('DELETE FROM session_players WHERE player_id=$1 AND session_id=$2 AND NOT EXISTS (SELECT 1 FROM player_registration_slots WHERE player_id=$1 AND session_id=$2)',[reg.player_id,row.session_id]);
  }

  const sessionSet=new Set();
  for(const x of unique){
    sessionSet.add(x.session_id);
    await db.query('INSERT INTO player_registration_slots(player_id,session_id,registration_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[reg.player_id,x.session_id,registration_id]);
    await db.query(`INSERT INTO player_schedule_occurrences(player_id,session_id,session_date,status,registration_id)
      VALUES($1,$2,$3,'Pending',$4)
      ON CONFLICT(player_id,session_id,session_date) DO UPDATE SET registration_id=EXCLUDED.registration_id`,
      [reg.player_id,x.session_id,x.session_date,registration_id]);
  }
  for(const sid of sessionSet){
    await db.query('INSERT INTO session_players(session_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[sid,reg.player_id]);
  }
  res.json({ok:true,registration_id,player_id:reg.player_id,selected_slots:unique.length,sessions:[...sessionSet]});
}