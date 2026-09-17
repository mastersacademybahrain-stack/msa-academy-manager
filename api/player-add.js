import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
  const user=await auth.getUser(req); if(!user)return res.status(401).json({error:'Login required'});
  const {name,sport,level,package_ids=[]}=req.body||{};
  if(!name||!sport)return res.status(400).json({error:'Name and sport required'});
  const r=await db.query('INSERT INTO players(name,sport,level) VALUES($1,$2,$3) RETURNING id,name,sport,level',[name,sport,level||'Junior']);
  const id=r.rows[0].id;
  for(const pid of package_ids) await db.query('INSERT INTO player_packages(player_id,package_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,pid]);
  res.json(r.rows[0]);
}