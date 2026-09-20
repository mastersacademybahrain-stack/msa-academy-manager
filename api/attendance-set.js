import { db } from 'hatchable';
import { requireAttendanceAccess } from '../lib/access.js';
export const access='user'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireAttendanceAccess(req,res)))return;
 const {session_id,player_id,status,session_date,guest_id}=req.body||{};
 if(!status||!['Present','Absent','Pending'].includes(status))return res.status(400).json({error:'Invalid attendance'});
 if(guest_id){await db.query('UPDATE attendance_guests SET status=$1 WHERE id=$2',[status,guest_id]);return res.json({ok:true});}
 if(!session_id)return res.status(400).json({error:'Session required'});
 if(!player_id)return res.status(400).json({error:'Player required'});
 if(!session_date)return res.status(400).json({error:'Session date required'});
 const x=await db.query('UPDATE player_schedule_occurrences SET status=$1,updated_at=now() WHERE player_id=$2 AND session_id=$3 AND session_date=$4 RETURNING id',[status,player_id,session_id,session_date]);
 if(!x.rows.length)return res.status(404).json({error:'Player is not scheduled for this session date'});
 res.json({ok:true});
}