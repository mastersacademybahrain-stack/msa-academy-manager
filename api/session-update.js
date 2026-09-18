import { db } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const {session_id,sport,day_of_week,start_time,coach_id=null,coach_ids=[],effective_start_date,weeks,apply_all=false,tennis_categories=[],location=null}=req.body||{};
 const coaches=[...new Set((Array.isArray(coach_ids)?coach_ids:(coach_id?[coach_id]:[])).filter(Boolean))];
 const primaryCoach=coaches[0]||null;
 const categoryMap={Tennis:['Red','Orange','Green','Yellow','Veteran'],Swimming:['Kids','Teens','Veterans'],'Water Polo':['Kids','Teens','Veterans'],Padel:['Kids','Teens','Veterans'],Taekwondo:['Kids','Teens']};
 const cats=Array.isArray(tennis_categories)?[...new Set(tennis_categories.filter(x=>(categoryMap[sport]||[]).includes(x)))]:[];
 const allowedLocations={Swimming:['Reef Fitness Club','Reef Beach Club'], 'Water Polo':['Reef Fitness Club','Reef Beach Club'], Tennis:['Reef Tennis Court','Ritz Carlton Lets Padel','Other Court'], Padel:['Ritz Carlton Lets Padel'], Fitness:['Reef Fitness Club'], Taekwondo:['Reef Fitness Club']};
 if(allowedLocations[sport]&&!allowedLocations[sport].includes(location))return res.status(400).json({error:'Select a valid location for this sport'});
 if((categoryMap[sport]||[]).length&&!cats.length)return res.status(400).json({error:'Select at least one category'});
 if(!session_id||!sport||day_of_week===undefined||!start_time||!effective_start_date)return res.status(400).json({error:'Session, sport, day, time and effective start date are required'});
 const n=Math.max(1,parseInt(weeks,10)||1),sd=new Date(effective_start_date+'T00:00:00');
 if(Number.isNaN(sd.getTime()))return res.status(400).json({error:'Invalid effective start date'});
 const today=new Date();today.setHours(0,0,0,0);if(sd<today)return res.status(400).json({error:'Changes cannot be applied to previous dates'});
 const old=await db.query('SELECT id,sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories,location FROM academy_sessions WHERE id=$1',[session_id]);if(!old.rows.length)return res.status(404).json({error:'Session not found'});
 const o=old.rows[0],oldEnd=o.end_date?new Date(o.end_date+'T00:00:00'):null;
 const allFuture=!!apply_all;
 const ed=allFuture?oldEnd:new Date(sd);if(!allFuture)ed.setDate(ed.getDate()+((n-1)*7)+6);const edISO=ed?ed.toISOString().slice(0,10):null;
 // If the edit starts at the beginning of this series, update the series row itself.
 if((o.start_date||'9999-12-31')===effective_start_date){
  if(+o.day_of_week!==+day_of_week){const players=await db.query('SELECT DISTINCT player_id FROM player_schedule_occurrences WHERE session_id=$1',[session_id]);await db.query('DELETE FROM player_schedule_occurrences WHERE session_id=$1',[session_id]);const end=allFuture?(o.end_date?new Date(o.end_date+'T00:00:00'):null):ed;for(const r of players.rows){for(let d=new Date(sd);!end||d<=end;d.setDate(d.getDate()+1)){if(d.getDay()===+day_of_week)await db.query('INSERT INTO player_schedule_occurrences(player_id,session_id,session_date,status) VALUES($1,$2,$3,\'Pending\') ON CONFLICT DO NOTHING',[r.player_id,session_id,d.toISOString().slice(0,10)]);}}}
  await db.query('UPDATE academy_sessions SET sport=$1,day_of_week=$2,start_time=$3,coach_id=$4,start_date=$5,end_date=$6,tennis_categories=$7,location=$8 WHERE id=$9',[sport,+day_of_week,start_time,primaryCoach,o.start_date,allFuture?o.end_date:edISO,cats,location,session_id]);
  await db.query('DELETE FROM session_coaches WHERE session_id=$1',[session_id]);
  for(const cid of coaches)await db.query('INSERT INTO session_coaches(session_id,coach_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[session_id,cid]);
  return res.json({ok:true,old_session_id:session_id,new_session_id:session_id,start_date:effective_start_date,end_date:allFuture?o.end_date:edISO,weeks:allFuture?'all':n});
 }
 const occ=edISO?await db.query('SELECT DISTINCT player_id FROM player_schedule_occurrences WHERE session_id=$1 AND session_date >= $2 AND session_date <= $3',[session_id,effective_start_date,edISO]):await db.query('SELECT DISTINCT player_id FROM player_schedule_occurrences WHERE session_id=$1 AND session_date >= $2',[session_id,effective_start_date]);
 const x=await db.query('INSERT INTO academy_sessions(sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories,location) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[sport,+day_of_week,start_time,primaryCoach,effective_start_date,edISO,cats,location]);
 const nid=x.rows[0].id;
 for(const cid of coaches)await db.query('INSERT INTO session_coaches(session_id,coach_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[nid,cid]);
 for(const r of occ.rows){if(allFuture){if(+o.day_of_week===+day_of_week){await db.query('UPDATE player_schedule_occurrences SET session_id=$1 WHERE session_id=$2 AND player_id=$3 AND session_date >= $4',[nid,session_id,r.player_id,effective_start_date]);}else{await db.query('DELETE FROM player_schedule_occurrences WHERE session_id=$1 AND player_id=$2 AND session_date >= $3',[session_id,r.player_id,effective_start_date]);const end=ed;for(let d=new Date(sd);!end||d<=end;d.setDate(d.getDate()+1)){if(d.getDay()===+day_of_week)await db.query('INSERT INTO player_schedule_occurrences(player_id,session_id,session_date,status) VALUES($1,$2,$3,\'Pending\') ON CONFLICT DO NOTHING',[r.player_id,nid,d.toISOString().slice(0,10)]);}}}else{for(let w=0;w<n;w++){const d=new Date(sd);const delta=((+day_of_week-d.getDay()+7)%7)+(w*7);d.setDate(d.getDate()+delta);if(ed&&d>ed)continue;await db.query('INSERT INTO player_schedule_occurrences(player_id,session_id,session_date,status) VALUES($1,$2,$3,\'Pending\') ON CONFLICT DO NOTHING',[r.player_id,nid,d.toISOString().slice(0,10)]);}}}
 if(!allFuture)await db.query('DELETE FROM player_schedule_occurrences WHERE session_id=$1 AND session_date >= $2 AND session_date <= $3',[session_id,effective_start_date,edISO]);
 if(!allFuture && (!oldEnd || oldEnd>ed)){
  const contStart=new Date(ed);contStart.setDate(contStart.getDate()+1);
  const c=await db.query('INSERT INTO academy_sessions(sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories,location) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[o.sport,o.day_of_week,o.start_time,o.coach_id,contStart.toISOString().slice(0,10),o.end_date,o.tennis_categories||[],o.location]);
  await db.query('UPDATE player_schedule_occurrences SET session_id=$1 WHERE session_id=$2 AND session_date > $3',[c.rows[0].id,session_id,edISO]);
  const sc=await db.query('SELECT coach_id FROM session_coaches WHERE session_id=$1',[session_id]);for(const r of sc.rows)await db.query('INSERT INTO session_coaches(session_id,coach_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[c.rows[0].id,r.coach_id]);
 }
 const prev=new Date(sd);prev.setDate(prev.getDate()-1);await db.query('UPDATE academy_sessions SET end_date=$1 WHERE id=$2',[prev.toISOString().slice(0,10),session_id]);
 res.json({ok:true,old_session_id:session_id,new_session_id:nid,start_date:effective_start_date,end_date:edISO,weeks:allFuture?'all':n});
}