import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
  const user=req.member||{};
  const {name,sport,sessions_per_week,duration_weeks,price}=req.body||{};
  if(!name||!sport)return res.status(400).json({error:'Package name and sport required'});
  const r=await db.query('INSERT INTO packages(name,sport,sessions_per_week,duration_weeks,price) VALUES($1,$2,$3,$4,$5) RETURNING id,name,sport,sessions_per_week,duration_weeks,price,active',[name,sport,sessions_per_week?+sessions_per_week:null,duration_weeks?+duration_weeks:null,price===undefined||price===''?null:+price]);
  res.json(r.rows[0]);
}