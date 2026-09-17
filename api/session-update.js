import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const user=req.member||{};
 const {session_id,sport,day_of_week,start_time,coach_id,player_ids=[]}=req.body||{};
 if(!session_id||!sport||day_of_week===undefined||!start_time)return res.status(400).json({error:'Missing session details'});
 await db.query('UPDATE academy_sessions SET sport=$1,day_of_week=$2,start_time=$3,coach_id=$4 WHERE id=$5',[sport,+day_of_week,start_time,coach_id||null,session_id]);
 await db.query('DELETE FROM session_players WHERE session_id=$1',[session_id]);
 for(const pid of player_ids) await db.query('INSERT INTO session_players(session_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[session_id,pid]);
 res.json({ok:true});
}