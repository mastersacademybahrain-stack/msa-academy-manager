import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='user'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const {session_id,effective_start_date,forward_weeks,delete_date}=req.body||{};
 if(!session_id)return res.status(400).json({error:'Session required'});
 const old=await db.query('SELECT id,sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories,location FROM academy_sessions WHERE id=$1',[session_id]);
 if(!old.rows.length)return res.status(404).json({error:'Session not found'});
 const s=old.rows[0];

 if(delete_date){
   const d=new Date(delete_date+'T00:00:00');
   if(Number.isNaN(d.getTime()))return res.status(400).json({error:'Invalid session date'});
   const iso=delete_date;
   const start=s.start_date?new Date(s.start_date+'T00:00:00'):null;
   const end=s.end_date?new Date(s.end_date+'T00:00:00'):null;
   if(start&&d<start || end&&d>end)return res.status(400).json({error:'That date is outside this session series'});
   const next=new Date(d);next.setDate(next.getDate()+1);
   const prev=new Date(d);prev.setDate(prev.getDate()-1);
   const nextISO=next.toISOString().slice(0,10),prevISO=prev.toISOString().slice(0,10);
   const hasBefore=!!start&&start<d,hasAfter=!!end&&end>d;

   if(hasBefore&&hasAfter){
     const c=await db.query('INSERT INTO academy_sessions(sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories,location) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[s.sport,s.day_of_week,s.start_time,s.coach_id,nextISO,s.end_date,s.tennis_categories||[],s.location||null]);
     const nid=c.rows[0].id;
     const coaches=await db.query('SELECT coach_id FROM session_coaches WHERE session_id=$1',[session_id]);
     for(const r of coaches.rows) await db.query('INSERT INTO session_coaches(session_id,coach_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[nid,r.coach_id]);
     await db.query('UPDATE player_schedule_occurrences SET session_id=$1 WHERE session_id=$2 AND session_date>$3',[nid,session_id,iso]);
     await db.query('UPDATE attendance_guests SET academy_session_id=$1 WHERE academy_session_id=$2 AND session_date>$3',[nid,session_id,iso]);
     await db.query('UPDATE academy_sessions SET end_date=$1 WHERE id=$2',[prevISO,session_id]);
   }else if(hasAfter){
     await db.query('UPDATE academy_sessions SET start_date=$1 WHERE id=$2',[nextISO,session_id]);
   }else{
     await db.query('DELETE FROM academy_sessions WHERE id=$1',[session_id]);
   }

   await db.query('DELETE FROM player_schedule_occurrences WHERE session_id=$1 AND session_date=$2',[session_id,iso]);
   await db.query('DELETE FROM attendance_guests WHERE academy_session_id=$1 AND session_date=$2',[session_id,iso]);
   return res.json({ok:true,deleted:'specific',date:iso});
 }

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
   const c=await db.query('INSERT INTO academy_sessions(sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories,location) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[s.sport,s.day_of_week,s.start_time,s.coach_id,contStart.toISOString().slice(0,10),s.end_date,s.tennis_categories||[],s.location||null]);
   for(const r of players.rows){
     const d=new Date(contStart);
     const delta=(+s.day_of_week-d.getDay()+7)%7;
     d.setDate(d.getDate()+delta);
     while(d<=originalEnd){await db.query('INSERT INTO player_schedule_occurrences(player_id,session_id,session_date,status) VALUES($1,$2,$3,\'Pending\') ON CONFLICT DO NOTHING',[r.player_id,c.rows[0].id,d.toISOString().slice(0,10)]);d.setDate(d.getDate()+7)}
   }
   const coaches=await db.query('SELECT coach_id FROM session_coaches WHERE session_id=$1',[session_id]);
   for(const r of coaches.rows) await db.query('INSERT INTO session_coaches(session_id,coach_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[c.rows[0].id,r.coach_id]);
 }
 await db.query('DELETE FROM player_schedule_occurrences WHERE session_id=$1 AND session_date >= $2 AND session_date <= $3',[session_id,effective_start_date,deleteEndISO]);
 await db.query('DELETE FROM attendance_guests WHERE academy_session_id=$1 AND session_date >= $2 AND session_date <= $3',[session_id,effective_start_date,deleteEndISO]);
 res.json({ok:true,deleted_from:effective_start_date,deleted_to:deleteEndISO,forward_weeks:n});
}