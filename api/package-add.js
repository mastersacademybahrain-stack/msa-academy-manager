import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
  const user=await auth.getUser(req); if(!user)return res.status(401).json({error:'Login required'});
  const {name,sport,sessions_per_week,duration_months,price}=req.body||{};
  if(!name||!sport)return res.status(400).json({error:'Package name and sport required'});
  const r=await db.query('INSERT INTO packages(name,sport,sessions_per_week,duration_months,price) VALUES($1,$2,$3,$4,$5) RETURNING id,name,sport,sessions_per_week,duration_months,price,active',[name,sport,sessions_per_week?+sessions_per_week:null,duration_months?+duration_months:null,price===undefined||price===''?null:+price]);
  res.json(r.rows[0]);
}