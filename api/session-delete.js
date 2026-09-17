import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const user=await auth.getUser(req); if(!user)return res.status(401).json({error:'Login required'});
 const {session_id}=req.body||{};
 if(!session_id)return res.status(400).json({error:'Session required'});
 await db.query('DELETE FROM academy_sessions WHERE id=$1',[session_id]);
 res.json({ok:true});
}