import { db, auth } from 'hatchable';
export const access='public'; export const methods=['GET'];
export default async function(req,res){
 const user=await auth.getUser(req); if(!user)return res.status(401).json({error:'Login required'});
 const p=await db.query("SELECT p.id,p.name,p.sport,p.level,COALESCE(json_agg(json_build_object('id',pk.id,'name',pk.name,'sport',pk.sport)) FILTER (WHERE pk.id IS NOT NULL),'[]') AS packages FROM players p LEFT JOIN player_packages pp ON pp.player_id=p.id LEFT JOIN packages pk ON pk.id=pp.package_id WHERE p.active=true GROUP BY p.id ORDER BY p.name");
 const c=await db.query('SELECT id,name,sport FROM coaches WHERE active=true ORDER BY name');
 const pk=await db.query('SELECT id,name,sport,sessions_per_week,COALESCE(duration_weeks, duration_months*4) AS duration_weeks,price,active FROM packages WHERE active=true ORDER BY name');
 const rg=await db.query('SELECT player_id,sessions_per_week,duration_weeks,start_date,session_ids FROM player_registrations');
 const reg=Object.fromEntries(rg.rows.map(x=>[x.player_id,x]));
 p.rows.forEach(x=>{x.registration=reg[x.id]||null});
 const s=await db.query("SELECT s.id,s.sport,s.day_of_week,s.start_time,s.coach_id,c.name AS coach_name,COALESCE(json_agg(json_build_object('id',p.id,'name',p.name,'status',COALESCE(a.status,'Pending')) ORDER BY p.name) FILTER (WHERE p.id IS NOT NULL),'[]') AS players FROM academy_sessions s LEFT JOIN coaches c ON c.id=s.coach_id LEFT JOIN session_players sp ON sp.session_id=s.id LEFT JOIN players p ON p.id=sp.player_id LEFT JOIN attendance a ON a.academy_session_id=s.id AND a.player_id=p.id GROUP BY s.id,c.name ORDER BY s.day_of_week,s.start_time");
 res.json({players:p.rows,coaches:c.rows,packages:pk.rows,sessions:s.rows,user});
}