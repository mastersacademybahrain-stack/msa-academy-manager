import { db, auth } from 'hatchable';
export const access='public'; export const methods=['GET'];
export default async function(req,res){
 const user=await auth.getUser(req); if(!user)return res.status(401).json({error:'Login required'});
 const p=await db.query('SELECT id,name,sport,level FROM players WHERE active=true ORDER BY name');
 const c=await db.query('SELECT id,name,sport FROM coaches WHERE active=true ORDER BY name');
 const s=await db.query("SELECT s.id,s.sport,s.day_of_week,s.start_time,s.coach_id,c.name AS coach_name,COALESCE(json_agg(json_build_object('id',p.id,'name',p.name,'status',COALESCE(a.status,'Pending')) ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL),'[]') AS players FROM academy_sessions s LEFT JOIN coaches c ON c.id=s.coach_id LEFT JOIN session_players sp ON sp.session_id=s.id LEFT JOIN players p ON p.id=sp.player_id LEFT JOIN attendance a ON a.session_id=s.id AND a.player_id=p.id GROUP BY s.id,c.name ORDER BY s.day_of_week,s.start_time");
 res.json({players:p.rows,coaches:c.rows,sessions:s.rows,user});
}