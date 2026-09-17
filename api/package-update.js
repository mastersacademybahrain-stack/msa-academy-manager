import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const user=req.member||{};
 const {id,name,sport,sessions_per_week,duration_weeks,price,discounted_price}=req.body||{};
 if(!id||!name||!sport)return res.status(400).json({error:'Package details required'});
 const r=await db.query('UPDATE packages SET name=$1,sport=$2,sessions_per_week=$3,duration_weeks=$4,price=$5,discounted_price=$6 WHERE id=$7 RETURNING id,name,sport,sessions_per_week,duration_weeks,price,discounted_price,active',[name,sport,sessions_per_week?+sessions_per_week:null,duration_weeks?+duration_weeks:null,price===undefined||price===''?null:+price,discounted_price===undefined||discounted_price===''?null:+discounted_price,id]);
 if(!r.rows.length)return res.status(404).json({error:'Package not found'}); res.json(r.rows[0]);
}