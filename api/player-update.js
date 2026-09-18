import { db, auth } from 'hatchable';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const user=req.member||{};
 const {id,name,sport,level,tennis_categories=[],package_ids=[]}=req.body||{};
 const cats=sport==='Tennis'&&Array.isArray(tennis_categories)?[...new Set(tennis_categories.filter(x=>['Red','Orange','Green','Yellow','Veteran'].includes(x)))]:[];
 if(!id||!name||!sport)return res.status(400).json({error:'Player details required'});
 const r=await db.query('UPDATE players SET name=$1,sport=$2,level=$3,tennis_categories=$4 WHERE id=$5 RETURNING id,name,sport,level,tennis_categories',[name,sport,level||'',cats,id]);
 if(!r.rows.length)return res.status(404).json({error:'Player not found'});
 await db.query('DELETE FROM player_packages WHERE player_id=$1',[id]);
 for(const pid of package_ids) await db.query('INSERT INTO player_packages(player_id,package_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[id,pid]);
 res.json(r.rows[0]);
}