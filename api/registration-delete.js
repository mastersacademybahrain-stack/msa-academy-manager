import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';

export const access='user';

export default async function(req,res){
  const a=await requireManager(req,res);
  if(!a)return;
  const {registration_id}=req.body||{};
  if(!registration_id)return res.status(400).json({error:'Registration ID is required'});
  const q=await db.query('SELECT id,player_id,package_id FROM player_registrations WHERE id=$1 LIMIT 1',[registration_id]);
  if(!q.rows.length)return res.status(404).json({error:'Registration not found'});
  const r=q.rows[0];

  await db.query('DELETE FROM attendance WHERE player_id=$1 AND academy_session_id IN (SELECT session_id FROM player_registration_slots WHERE registration_id=$2)',[r.player_id,registration_id]);
  await db.query('DELETE FROM session_players WHERE player_id=$1 AND session_id IN (SELECT session_id FROM player_registration_slots WHERE registration_id=$2)',[r.player_id,registration_id]);
  await db.query('DELETE FROM player_schedule_occurrences WHERE registration_id=$1',[registration_id]);
  await db.query('DELETE FROM player_registration_slots WHERE registration_id=$1',[registration_id]);
  await db.query('DELETE FROM player_registrations WHERE id=$1',[registration_id]);

  if(r.package_id){
    await db.query('DELETE FROM player_packages WHERE player_id=$1 AND package_id=$2 AND NOT EXISTS (SELECT 1 FROM player_registrations WHERE player_id=$1 AND package_id=$2)',[r.player_id,r.package_id]);
  }
  res.json({ok:true,deleted_registration_id:registration_id,player_id:r.player_id});
}