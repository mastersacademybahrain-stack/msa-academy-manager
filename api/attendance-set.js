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
 await db.query('INSERT INTO attendance(academy_session_id,player_id,status) VALUES($1,$2,$3) ON CONFLICT(academy_session_id,player_id) DO UPDATE SET status=EXCLUDED.status,updated_at=now()',[session_id,player_id,status]);
 if(session_date)await db.query('UPDATE player_schedule_occurrences SET status=$1,updated_at=now() WHERE player_id=$2 AND session_id=$3 AND session_date=$4',[status,player_id,session_id,session_date]);
 res.json({ok:true});
}