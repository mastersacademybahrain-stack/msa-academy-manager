import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const user=req.member||{};
 const {name,sport,level='Junior',package_ids=[],sessions_per_week,duration_weeks,registration_start_date}=req.body||{};
 if(!name||!sport)return res.status(400).json({error:'Player details required'});
 const r=await db.query('INSERT INTO players(name,sport,level) VALUES($1,$2,$3) RETURNING id,name,sport,level',[name,sport,level]);
 const player=r.rows[0];
 for(const pid of package_ids) await db.query('INSERT INTO player_packages(player_id,package_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[player.id,pid]);
 res.json(player);
}