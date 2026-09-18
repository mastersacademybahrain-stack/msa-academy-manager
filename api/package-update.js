import { db, auth } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const user=req.member||{};
 const {id,name,sport,sessions_per_week,duration_weeks,price,net_price,package_type,start_date,end_date}=req.body||{};
 const type=['Monthly','Term','Private','Trial'].includes(package_type)?package_type:'Monthly';
 const sessions=[1,2,3,4].includes(+sessions_per_week)?+sessions_per_week:null;
 let weeks=+duration_weeks||null;
 if(type==='Monthly') weeks=4;
 if(type==='Term'){if(!start_date||!end_date||end_date<start_date)return res.status(400).json({error:'Term packages require a valid start and end date'});weeks=Math.max(1,Math.ceil((new Date(end_date+'T00:00:00')-new Date(start_date+'T00:00:00'))/604800000));}
 if(!sessions||!weeks)return res.status(400).json({error:'Select sessions per week and a valid package duration'});
 if(!id||!name||!sport)return res.status(400).json({error:'Package details required'});
 const r=await db.query('UPDATE packages SET name=$1,sport=$2,sessions_per_week=$3,duration_weeks=$4,price=$5,net_price=$6,package_type=$7,start_date=$8,end_date=$9 WHERE id=$10 RETURNING id,name,sport,sessions_per_week,duration_weeks,price,net_price,package_type,start_date,end_date,active',[name,sport,sessions,weeks,price===undefined||price===''?null:+price,net_price===undefined||net_price===''?null:+net_price,type,start_date||null,end_date||null,id]);
 if(!r.rows.length)return res.status(404).json({error:'Package not found'}); res.json(r.rows[0]);
}