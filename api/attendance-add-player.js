import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const user=await auth.getUser(req); if(!user)return res.status(401).json({error:'Login required'});
 const {session_id,player_id,status='Present'}=req.body||{};
 if(!session_id||!player_id)return res.status(400).json({error:'Missing session or player'});
 const s=await db.query('SELECT id,sport FROM academy_sessions WHERE id=$1',[session_id]);
 if(!s.rows.length)return res.status(404).json({error:'Session not found'});
 const p=await db.query('SELECT id,sport FROM players WHERE id=$1',[player_id]);
 if(!p.rows.length)return res.status(404).json({error:'Player not found'});
 if(p.rows[0].sport!==s.rows[0].sport)return res.status(400).json({error:'Player sport does not match session sport'});
 await db.query('INSERT INTO session_players(session_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[session_id,player_id]);
 await db.query('INSERT INTO attendance(academy_session_id,player_id,status) VALUES($1,$2,$3) ON CONFLICT(academy_session_id,player_id) DO UPDATE SET status=EXCLUDED.status,updated_at=now()',[session_id,player_id,status]);
 res.json({ok:true});
}