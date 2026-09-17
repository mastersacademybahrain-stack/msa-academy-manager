import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const user=await auth.getUser(req); if(!user)return res.status(401).json({error:'Login required'});
 const {id,name,sport,sessions_per_week,duration_months,price}=req.body||{};
 if(!id||!name||!sport)return res.status(400).json({error:'Package details required'});
 const r=await db.query('UPDATE packages SET name=$1,sport=$2,sessions_per_week=$3,duration_months=$4,price=$5 WHERE id=$6 RETURNING id,name,sport,sessions_per_week,duration_months,price,active',[name,sport,sessions_per_week?+sessions_per_week:null,duration_months?+duration_months:null,price===undefined||price===''?null:+price,id]);
 if(!r.rows.length)return res.status(404).json({error:'Package not found'}); res.json(r.rows[0]);
}