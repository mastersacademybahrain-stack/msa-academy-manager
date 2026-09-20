import { db } from 'hatchable';
import { requireAttendanceAccess } from '../lib/access.js';
export const access='user'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireAttendanceAccess(req,res)))return;
 const {session_id,player_id,status='Present',guest_name,session_date}=req.body||{};
 if(!session_id)return res.status(400).json({error:'Session required'});
 if(guest_name?.trim()){
  const s=await db.query('SELECT id,sport,day_of_week FROM academy_sessions WHERE id=$1',[session_id]);
  if(!s.rows.length)return res.status(404).json({error:'Session not found'});
  if(!session_date)return res.status(400).json({error:'Session date required'});
  const x=await db.query('INSERT INTO attendance_guests(academy_session_id,guest_name,status,session_date) VALUES($1,$2,$3,$4) RETURNING id,guest_name,status,session_date',[session_id,guest_name.trim(),status,session_date]);
  return res.json(x.rows[0]);
 }
 if(!player_id)return res.status(400).json({error:'Player or guest name required'});
 const s=await db.query('SELECT id,sport,day_of_week FROM academy_sessions WHERE id=$1',[session_id]);
 const p=await db.query('SELECT id,sport FROM players WHERE id=$1',[player_id]);
 if(!s.rows.length||!p.rows.length)return res.status(404).json({error:'Session or player not found'});
 const r=await db.query('SELECT 1 FROM player_registrations WHERE player_id=$1 AND sport=$2 LIMIT 1',[player_id,s.rows[0].sport]);
 if(s.rows[0].sport!==p.rows[0].sport&&!r.rows.length)return res.status(400).json({error:'Player has no registration for this sport'});
 await db.query('INSERT INTO attendance(academy_session_id,player_id,status) VALUES($1,$2,$3) ON CONFLICT(academy_session_id,player_id) DO UPDATE SET status=EXCLUDED.status,updated_at=now()',[session_id,player_id,status]);
 if(session_date)await db.query('INSERT INTO player_schedule_occurrences(player_id,session_id,session_date,status) VALUES($1,$2,$3,$4) ON CONFLICT(player_id,session_id,session_date) DO UPDATE SET status=EXCLUDED.status,updated_at=now()',[player_id,session_id,session_date,status]);
 res.json({ok:true});
}