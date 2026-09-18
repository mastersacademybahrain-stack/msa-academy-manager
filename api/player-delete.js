import { db, auth } from 'hatchable';
export const access='admin'; export const methods=['POST'];
export default async function(req,res){
 const user=req.member||{};
 const {id}=req.body||{}; if(!id)return res.status(400).json({error:'Player required'});
 await db.query('DELETE FROM player_packages WHERE player_id=$1',[id]);
 await db.query('DELETE FROM attendance WHERE player_id=$1',[id]);
 await db.query('DELETE FROM session_players WHERE player_id=$1',[id]);
 const r=await db.query('DELETE FROM players WHERE id=$1',[id]);
 if(!r.changes)return res.status(404).json({error:'Player not found'}); res.json({ok:true});
}