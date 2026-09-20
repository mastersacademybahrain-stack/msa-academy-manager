import { db, auth } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='user'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const user=req.member||{};
 const {id}=req.body||{}; if(!id)return res.status(400).json({error:'Package required'});
 await db.query('DELETE FROM player_packages WHERE package_id=$1',[id]);
 const r=await db.query('DELETE FROM packages WHERE id=$1',[id]);
 if(!r.changes)return res.status(404).json({error:'Package not found'}); res.json({ok:true});
}