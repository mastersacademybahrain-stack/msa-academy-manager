import { db, auth } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
  const user=req.member||{};
  const {name,sport,sessions_per_week,duration_weeks,price,net_price,package_type,start_date,end_date}=req.body||{};
  const type=['Monthly','Term','Private','Trial'].includes(package_type)?package_type:'Monthly';
  const sessions=[1,2,3,4].includes(+sessions_per_week)?+sessions_per_week:null;
  let weeks=+duration_weeks||null;
  if(type==='Monthly') weeks=4;
  if(type==='Term'){if(!start_date||!end_date||end_date<start_date)return res.status(400).json({error:'Term packages require a valid start and end date'});weeks=Math.max(1,Math.ceil((new Date(end_date+'T00:00:00')-new Date(start_date+'T00:00:00'))/604800000));}
  if(!sessions||!weeks)return res.status(400).json({error:'Select sessions per week and a valid package duration'});
  if(!name||!sport)return res.status(400).json({error:'Package name and sport required'});
  const r=await db.query('INSERT INTO packages(name,sport,sessions_per_week,duration_weeks,price,net_price,package_type,start_date,end_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,name,sport,sessions_per_week,duration_weeks,price,net_price,package_type,start_date,end_date,active',[name,sport,sessions,weeks,price===undefined||price===''?null:+price,net_price===undefined||net_price===''?null:+net_price,type,start_date||null,end_date||null]);
  res.json(r.rows[0]);
}