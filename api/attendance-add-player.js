import { db } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const {session_id,player_id,status='Present',guest_name}=req.body||{};
 if(!session_id)return res.status(400).json({error:'Session required'});
 if(guest_name?.trim()){
  const s=await db.query('SELECT id,sport,day_of_week FROM academy_sessions WHERE id=$1',[session_id]);
  if(!s.rows.length)return res.status(404).json({error:'Session not found'});
  const x=await db.query('INSERT INTO attendance_guests(academy_session_id,guest_name,status,session_date) VALUES($1,$2,$3,$4) RETURNING id,guest_name,status,session_date',[session_id,guest_name.trim(),status,req.body.session_date]);
  return res.json(x.rows[0]);
 }
 if(!player_id)return res.status(400).json({error:'Player or guest name required'});
 const s=await db.query('SELECT id,sport,day_of_week FROM academy_sessions WHERE id=$1',[session_id]);
 const p=await db.query('SELECT id,sport FROM players WHERE id=$1',[player_id]);
 if(!s.rows.length||!p.rows.length)return res.status(404).json({error:'Session or player not found'});
 if(s.rows[0].sport!==p.rows[0].sport)return res.status(400).json({error:'Player sport does not match session'});
 await db.query('INSERT INTO attendance(academy_session_id,player_id,status) VALUES($1,$2,$3) ON CONFLICT(academy_session_id,player_id) DO UPDATE SET status=EXCLUDED.status,updated_at=now()',[session_id,player_id,status]);
 res.json({ok:true});
}