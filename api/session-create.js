import { db } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const {sport,day_of_week,start_time,coach_id=null,coach_ids=[],start_date,replicate=false,end_date=null,tennis_categories=[],location=null}=req.body||{};
 const coaches=[...new Set((Array.isArray(coach_ids)?coach_ids:(coach_id?[coach_id]:[])).filter(Boolean))];
 const primaryCoach=coaches[0]||null;
 const cats=sport==='Tennis'&&Array.isArray(tennis_categories)?[...new Set(tennis_categories.filter(x=>['Red','Orange','Green','Yellow','Veteran'].includes(x)))]:[];
 const allowedLocations={Swimming:['Reef Fitness Club','Reef Beach Club'], 'Water Polo':['Reef Fitness Club','Reef Beach Club'], Tennis:['Reef Island','Reef Tennis Court','Ritz Carlton Lets Padel','Other Court'], Padel:['Ritz Carlton Lets Padel'], Fitness:['Reef Fitness Club'], Taekwondo:['Reef Fitness Club']};
 if(allowedLocations[sport]&&!allowedLocations[sport].includes(location))return res.status(400).json({error:'Select a valid location for this sport'});
 if(sport==='Tennis'&&!cats.length)return res.status(400).json({error:'Select at least one tennis category'});
 if(!sport||day_of_week===undefined||!start_time||!start_date)return res.status(400).json({error:'Sport, day, time and start date are required'});
 const sd=new Date(start_date+'T00:00:00');
 if(Number.isNaN(sd.getTime()))return res.status(400).json({error:'Invalid start date'});
 let ed=null;
 if(replicate){
  if(!end_date)return res.status(400).json({error:'End date is required when replicating'});
  ed=new Date(end_date+'T00:00:00');
  if(Number.isNaN(ed.getTime())||ed<sd)return res.status(400).json({error:'End date must be on or after the start date'});
 }else ed=sd;
 const x=await db.query('INSERT INTO academy_sessions(sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories,location) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,sport,day_of_week,start_time,coach_id,start_date,end_date,tennis_categories,location',[sport,+day_of_week,start_time,primaryCoach,start_date,ed.toISOString().slice(0,10),cats,location]);
 for(const cid of coaches)await db.query('INSERT INTO session_coaches(session_id,coach_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[x.rows[0].id,cid]);
 res.json(x.rows[0]);
}