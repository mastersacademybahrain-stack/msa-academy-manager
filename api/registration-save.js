import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const user=await auth.getUser(req); if(!user)return res.status(401).json({error:'Login required'});
 const {player_id,sessions_per_week,duration_weeks,start_date,session_ids=[]}=req.body||{};
 if(!player_id||!sessions_per_week||!duration_weeks||!start_date)return res.status(400).json({error:'Registration details required'});
 const n=+sessions_per_week,w=+duration_weeks;
 if(n<1||n>7||w<1)return res.status(400).json({error:'Invalid sessions or weeks'});
 if(!Array.isArray(session_ids)||session_ids.length!==n)return res.status(400).json({error:'Select exactly the sessions per week'});
 const p=await db.query('SELECT id,sport FROM players WHERE id=$1',[player_id]);
 if(!p.rows.length)return res.status(404).json({error:'Player not found'});
 const ss=await db.query('SELECT id,sport FROM academy_sessions WHERE id=ANY($1::uuid[])',[session_ids]);
 if(ss.rows.length!==n||ss.rows.some(x=>x.sport!==p.rows[0].sport))return res.status(400).json({error:'Selected sessions must match player sport'});
 const first=new Date(start_date+'T00:00:00');
 if(Number.isNaN(first.getTime()))return res.status(400).json({error:'Invalid start date'});
 await db.query('DELETE FROM player_registrations WHERE player_id=$1',[player_id]);
 await db.query('INSERT INTO player_registrations(player_id,sessions_per_week,duration_weeks,start_date,session_ids) VALUES($1,$2,$3,$4,$5)',[player_id,n,w,start_date,session_ids]);
 await db.query('DELETE FROM session_players WHERE player_id=$1',[player_id]);
 for(const sid of session_ids) await db.query('INSERT INTO session_players(session_id,player_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[sid,player_id]);
 res.json({ok:true,player_id,sessions_per_week:n,duration_weeks:w,start_date,session_ids});
}