import { db, auth } from 'hatchable';
export const access='public'; export const methods=['POST'];
export default async function(req,res){
 const user=req.member||{};
 const {player_id,package_id,start_date,session_ids=[]}=req.body||{};
 if(!player_id||!package_id||!start_date)return res.status(400).json({error:'Player, package and starting date are required'});
 const pkg=await db.query('SELECT id,sport,sessions_per_week,duration_weeks FROM packages WHERE id=$1 AND active=true',[package_id]);
 if(!pkg.rows.length)return res.status(404).json({error:'Package not found'});
 const n=+pkg.rows[0].sessions_per_week,w=+pkg.rows[0].duration_weeks;
 if(!n||!w)return res.status(400).json({error:'Package must have sessions per week and duration in weeks'});
 if(!Array.isArray(session_ids)||session_ids.length!==n)return res.status(400).json({error:'Select exactly '+n+' schedule slots'});
 const p=await db.query('SELECT id,sport FROM players WHERE id=$1',[player_id]);
 if(!p.rows.length)return res.status(404).json({error:'Player not found'});
 const ss=await db.query('SELECT id,sport,day_of_week,tennis_categories FROM academy_sessions WHERE id=ANY($1::uuid[])',[session_ids]);
 if(ss.rows.length!==n||ss.rows.some(x=>x.sport!==p.rows[0].sport||x.sport!==pkg.rows[0].sport))return res.status(400).json({error:'Selected slots must match the player and package sport'});
 if(pkg.rows[0].sport==='Tennis'){
  const pc=await db.query('SELECT tennis_categories FROM players WHERE id=$1',[player_id]);
  const cats=pc.rows[0]?.tennis_categories||[];
  if(!cats.length)return res.status(400).json({error:'Select at least one tennis category for the player'});
  if(ss.rows.some(x=>!(x.tennis_categories||[]).some(c=>cats.includes(c))))return res.status(400).json({error:'Each selected tennis slot must match at least one player category'});
 }
 await db.query('DELETE FROM player_registration_slots WHERE player_id=$1',[player_id]);
 await db.query('DELETE FROM player_schedule_occurrences WHERE player_id=$1',[player_id]);
 await db.query('DELETE FROM player_registrations WHERE player_id=$1',[player_id]);
 await db.query('INSERT INTO player_registrations(player_id,sessions_per_week,duration_weeks,start_date) VALUES($1,$2,$3,$4)',[player_id,n,w,start_date]);
 for(const sid of session_ids) await db.query('INSERT INTO player_registration_slots(player_id,session_id) VALUES($1,$2)',[player_id,sid]);
 const start=new Date(start_date+'T00:00:00');
 const lastDates={};
 for(let week=0;week<w;week++) for(const s of ss.rows){
   const d=new Date(start); const delta=((+s.day_of_week-d.getDay()+7)%7)+(week*7); d.setDate(d.getDate()+delta);
   const iso=d.toISOString().slice(0,10); lastDates[s.id]=lastDates[s.id]&&lastDates[s.id]>iso?lastDates[s.id]:iso;
   await db.query('INSERT INTO player_schedule_occurrences(player_id,session_id,session_date) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[player_id,s.id,iso]);
 }
 for(const s of ss.rows){
   const last=lastDates[s.id];
   if(last) await db.query('UPDATE academy_sessions SET end_date=$1 WHERE id=$2 AND (end_date IS NULL OR end_date<$1)',[last,s.id]);
 }
 res.json({ok:true,player_id,package_id,sessions_per_week:n,duration_weeks:w,start_date,session_ids});
}