import { db } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const {sport,day_of_week,start_time,coach_id=null,start_date,replicate=false,end_date=null}=req.body||{};
 if(!sport||day_of_week===undefined||!start_time||!start_date)return res.status(400).json({error:'Sport, day, time and start date are required'});
 const sd=new Date(start_date+'T00:00:00');
 if(Number.isNaN(sd.getTime()))return res.status(400).json({error:'Invalid start date'});
 let ed=null;
 if(replicate){
  if(!end_date)return res.status(400).json({error:'End date is required when replicating'});
  ed=new Date(end_date+'T00:00:00');
  if(Number.isNaN(ed.getTime())||ed<sd)return res.status(400).json({error:'End date must be on or after the start date'});
 }else ed=sd;
 const x=await db.query('INSERT INTO academy_sessions(sport,day_of_week,start_time,coach_id,start_date,end_date) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,sport,day_of_week,start_time,coach_id,start_date,end_date',[sport,+day_of_week,start_time,coach_id,start_date,ed.toISOString().slice(0,10)]);
 res.json(x.rows[0]);
}