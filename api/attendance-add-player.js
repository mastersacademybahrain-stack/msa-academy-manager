import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const user=await auth.getUser(req); if(!user)return res.status(401).json({error:'Login required'});
 const {session_id,player_id,status='Present'}=req.body||{};
 if(!session_id||!player_id)return res.status(400).json({error:'Missing session or player'});
 await db.query('INSERT INTO session_players(session_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[session_id,player_id]);
 await db.query('INSERT INTO attendance(academy_session_id,player_id,status) VALUES($1,$2,$3) ON CONFLICT(academy_session_id,player_id) DO UPDATE SET status=EXCLUDED.status,updated_at=now()',[session_id,player_id,status]);
 res.json({ok:true});
}