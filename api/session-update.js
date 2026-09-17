import { db } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const {session_id,sport,day_of_week,start_time,coach_id=null,effective_start_date,weeks,tennis_categories=[]}=req.body||{};
 const cats=sport==='Tennis'&&Array.isArray(tennis_categories)?[...new Set(tennis_categories.filter(x=>['Red','Orange','Green','Yellow','Veteran'].includes(x)))]:[];
 if(sport==='Tennis'&&!cats.length)return res.status(400).json({error:'Select at least one tennis category'});
 if(!session_id||!sport||day_of_week===undefined||!start_time||!effective_start_date)return res.status(400).json({error:'Session, sport, day, time and effective start date are required'});
 const n=Math.max(1,parseInt(weeks,10)||1),sd=new Date(effective_start_date+'T00:00:00');
 if(Number.isNaN(sd.getTime()))return res.status(400).json({error:'Invalid effective start date'});
 const today=new Date();today.setHours(0,0,0,0);if(sd<today)return res.status(400).json({error:'Changes cannot be applied to previous dates'});
 const ed=new Date(sd);ed.setDate(ed.getDate()+((n-1)*7)+6);const edISO=ed.toISOString().slice(0,10);
 const old=await db.query('SELECT id,sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories FROM academy_sessions WHERE id=$1',[session_id]);if(!old.rows.length)return res.status(404).json({error:'Session not found'});
 const o=old.rows[0];
 const occ=await db.query('SELECT DISTINCT player_id FROM player_schedule_occurrences WHERE session_id=$1 AND session_date >= $2 AND session_date <= $3',[session_id,effective_start_date,edISO]);
 const x=await db.query('INSERT INTO academy_sessions(sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories',[sport,+day_of_week,start_time,coach_id,effective_start_date,edISO,cats]);
 const nid=x.rows[0].id;
 for(const r of occ.rows){for(let w=0;w<n;w++){const d=new Date(sd);const delta=((+day_of_week-d.getDay()+7)%7)+(w*7);d.setDate(d.getDate()+delta);if(d>ed)continue;await db.query('INSERT INTO player_schedule_occurrences(player_id,session_id,session_date,status) VALUES($1,$2,$3,\'Pending\') ON CONFLICT DO NOTHING',[r.player_id,nid,d.toISOString().slice(0,10)]);}}
 await db.query('DELETE FROM player_schedule_occurrences WHERE session_id=$1 AND session_date >= $2 AND session_date <= $3',[session_id,effective_start_date,edISO]);
 const oldEnd=o.end_date?new Date(o.end_date+'T00:00:00'):null;
 if(oldEnd && oldEnd>ed){
  const contStart=new Date(ed);contStart.setDate(contStart.getDate()+1);
  const c=await db.query('INSERT INTO academy_sessions(sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[o.sport,o.day_of_week,o.start_time,o.coach_id,contStart.toISOString().slice(0,10),o.end_date,o.tennis_categories||[]]);
  await db.query('UPDATE player_schedule_occurrences SET session_id=$1 WHERE session_id=$2 AND session_date > $3',[c.rows[0].id,session_id,edISO]);
 }
 const prev=new Date(sd);prev.setDate(prev.getDate()-1);
 await db.query('UPDATE academy_sessions SET end_date=$1 WHERE id=$2',[prev.toISOString().slice(0,10),session_id]);
 res.json({ok:true,old_session_id:session_id,new_session_id:nid,start_date:effective_start_date,end_date:edISO,weeks:n});
}