import { db, auth } from 'hatchable';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const user=req.member||{};
 const {name,sport,level='Junior',tennis_categories=[],package_ids=[],sessions_per_week,duration_weeks,registration_start_date}=req.body||{};
 const cats=sport==='Tennis'&&Array.isArray(tennis_categories)?[...new Set(tennis_categories.filter(x=>['Red','Orange','Green','Yellow','Veteran'].includes(x)))]:[];
 if(!name||!sport)return res.status(400).json({error:'Player details required'});
 const r=await db.query('INSERT INTO players(name,sport,level,tennis_categories) VALUES($1,$2,$3,$4) RETURNING id,name,sport,level,tennis_categories',[name,sport,level,cats]);
 const player=r.rows[0];
 for(const pid of package_ids) await db.query('INSERT INTO player_packages(player_id,package_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[player.id,pid]);
 res.json(player);
}