import { db } from 'hatchable';
export const access='admin'; export const methods=['POST'];
export default async function(req,res){
 const {session_id,effective_start_date,forward_weeks}=req.body||{};
 if(!session_id)return res.status(400).json({error:'Session required'});
 const old=await db.query('SELECT id,sport,day_of_week,start_time,coach_id,start_date,end_date FROM academy_sessions WHERE id=$1',[session_id]);
 if(!old.rows.length)return res.status(404).json({error:'Session not found'});
 const s=old.rows[0];
 if(!effective_start_date){
   await db.query('DELETE FROM academy_sessions WHERE id=$1',[session_id]);
   return res.json({ok:true,deleted:'all'});
 }
 const n=Math.max(1,parseInt(forward_weeks,10)||1);
 const sd=new Date(effective_start_date+'T00:00:00');
 if(Number.isNaN(sd.getTime()))return res.status(400).json({error:'Invalid effective start date'});
 const today=new Date();today.setHours(0,0,0,0);
 if(sd<today)return res.status(400).json({error:'Deletion cannot be applied to previous dates'});
 const originalEnd=s.end_date?new Date(s.end_date+'T00:00:00'):null;
 const requestedEnd=new Date(sd);requestedEnd.setDate(requestedEnd.getDate()+n*7-1);
 const deleteEnd=originalEnd&&originalEnd<requestedEnd?originalEnd:requestedEnd;
 const deleteEndISO=deleteEnd.toISOString().slice(0,10);
 const before=new Date(sd);before.setDate(before.getDate()-1);
 const players=await db.query('SELECT DISTINCT player_id FROM player_schedule_occurrences WHERE session_id=$1 AND session_date > $2',[session_id,deleteEndISO]);
 if(s.start_date && new Date(s.start_date+'T00:00:00')<sd){
   await db.query('UPDATE academy_sessions SET end_date=$1 WHERE id=$2',[before.toISOString().slice(0,10),session_id]);
 } else {
   await db.query('DELETE FROM academy_sessions WHERE id=$1',[session_id]);
 }
 if(originalEnd && originalEnd>deleteEnd){
   const contStart=new Date(deleteEnd);contStart.setDate(contStart.getDate()+1);
   const c=await db.query('INSERT INTO academy_sessions(sport,day_of_week,start_time,coach_id,start_date,end_date) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[s.sport,s.day_of_week,s.start_time,s.coach_id,contStart.toISOString().slice(0,10),s.end_date]);
   for(const r of players.rows){
     const d=new Date(contStart);
     const delta=(+s.day_of_week-d.getDay()+7)%7;
     d.setDate(d.getDate()+delta);
     while(d<=originalEnd){await db.query('INSERT INTO player_schedule_occurrences(player_id,session_id,session_date,status) VALUES($1,$2,$3,\'Pending\') ON CONFLICT DO NOTHING',[r.player_id,c.rows[0].id,d.toISOString().slice(0,10)]);d.setDate(d.getDate()+7)}
   }
 }
 await db.query('DELETE FROM player_schedule_occurrences WHERE session_id=$1 AND session_date >= $2 AND session_date <= $3',[session_id,effective_start_date,deleteEndISO]);
 res.json({ok:true,deleted_from:effective_start_date,deleted_to:deleteEndISO,forward_weeks:n});
}