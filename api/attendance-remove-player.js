import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='user';
export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const {session_id,player_id,guest_id,session_date}=req.body||{};
 if(!session_id)return res.status(400).json({error:'Session required'});
 if(guest_id){
  const r=await db.query('DELETE FROM attendance_guests WHERE id=$1 AND academy_session_id=$2 RETURNING id',[guest_id,session_id]);
  if(!r.rows.length)return res.status(404).json({error:'Unplanned attendee not found'});
  return res.json({ok:true});
 }
 if(!player_id)return res.status(400).json({error:'Player required'});
 const reg=await db.query('SELECT 1 FROM player_registration_slots WHERE player_id=$1 AND session_id=$2 LIMIT 1',[player_id,session_id]);
 if(reg.rows.length)return res.status(400).json({error:'This player is registered for this session and cannot be removed manually.'});
 if(session_date)await db.query('DELETE FROM player_schedule_occurrences WHERE player_id=$1 AND session_id=$2 AND session_date=$3',[player_id,session_id,session_date]);
 await db.query('DELETE FROM attendance WHERE player_id=$1 AND academy_session_id=$2',[player_id,session_id]);
 res.json({ok:true});
}