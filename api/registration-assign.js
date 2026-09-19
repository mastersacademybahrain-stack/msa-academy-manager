import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const {registration_id,session_ids=[]}=req.body||{};
 if(!registration_id)return res.status(400).json({error:'Registration required'});
 const reg=await db.query("SELECT pr.id,pr.player_id,pr.package_id,pr.sessions_per_week,pr.number_weeks,pr.start_date,pr.registration_no,p.sport,p.tennis_categories,pk.package_type,pk.end_date AS package_end_date FROM player_registrations pr JOIN players p ON p.id=pr.player_id JOIN packages pk ON pk.id=pr.package_id WHERE pr.id=$1",[registration_id]);
 if(!reg.rows.length)return res.status(404).json({error:'Registration not found'});
 const r=reg.rows[0],ids=Array.isArray(session_ids)?[...new Set(session_ids)]:[];
 if(ids.length!==+r.sessions_per_week)return res.status(400).json({error:'Select exactly '+r.sessions_per_week+' slot'+(r.sessions_per_week===1?'':'s')});
 const ss=await db.query("SELECT id,sport,day_of_week,start_time,start_date,end_date,tennis_categories FROM academy_sessions WHERE id=ANY($1::uuid[])",[ids]);
 if(ss.rows.length!==ids.length||ss.rows.some(s=>s.sport!==r.sport))return res.status(400).json({error:'All selected slots must match the registration sport'});
 if(r.sport==='Tennis'){
  const cats=r.tennis_categories||[];
  if(!cats.length)return res.status(400).json({error:'Player has no Tennis category'});
  if(ss.rows.some(s=>!(s.tennis_categories||[]).some(c=>cats.includes(c))))return res.status(400).json({error:'Each selected slot must match the player Tennis category'});
 }
 await db.query('DELETE FROM player_registration_slots WHERE registration_id=$1',[registration_id]);
 await db.query('DELETE FROM player_schedule_occurrences WHERE registration_id=$1',[registration_id]);
 for(const sid of ids){await db.query('INSERT INTO player_registration_slots(registration_id,player_id,session_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[registration_id,r.player_id,sid]);await db.query('INSERT INTO session_players(session_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[sid,r.player_id]);}
 const start=new Date(r.start_date+'T00:00:00'),w=+r.number_weeks,lastDates={};
 for(let week=0;week<w;week++) for(const s of ss.rows){
  const d=new Date(start);const delta=((+s.day_of_week-d.getDay()+7)%7)+(week*7);d.setDate(d.getDate()+delta);const iso=d.toISOString().slice(0,10);
  if(r.package_type==='Term'&&r.package_end_date&&iso>r.package_end_date)continue;
  lastDates[s.id]=lastDates[s.id]&&lastDates[s.id]>iso?lastDates[s.id]:iso;
  await db.query('INSERT INTO player_schedule_occurrences(player_id,registration_id,session_id,session_date) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[r.player_id,registration_id,s.id,iso]);
 }
 for(const s of ss.rows)if(lastDates[s.id])await db.query('UPDATE academy_sessions SET end_date=$1 WHERE id=$2 AND (end_date IS NULL OR end_date<$1)',[lastDates[s.id],s.id]);
 res.json({ok:true,registration_id,session_ids:ids,slots_assigned:true});
}