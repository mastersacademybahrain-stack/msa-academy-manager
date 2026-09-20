import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';

export const access='user';
export const methods=['POST'];

export default async function(req,res){
  const a=await requireManager(req,res);
  if(!a)return;
  const {id}=req.body||{};
  if(!id)return res.status(400).json({error:'Player required'});

  const exists=await db.query('SELECT id FROM players WHERE id=$1 LIMIT 1',[id]);
  if(!exists.rows.length)return res.status(404).json({error:'Player not found'});

  // Remove registration-dependent records first so every player can be deleted cleanly.
  await db.query('DELETE FROM player_schedule_occurrences WHERE player_id=$1',[id]);
  await db.query('DELETE FROM player_registration_slots WHERE player_id=$1',[id]);
  await db.query('DELETE FROM attendance WHERE player_id=$1',[id]);
  await db.query('DELETE FROM session_players WHERE player_id=$1',[id]);
  await db.query('DELETE FROM player_registrations WHERE player_id=$1',[id]);
  await db.query('DELETE FROM player_packages WHERE player_id=$1',[id]);
  await db.query('DELETE FROM players WHERE id=$1',[id]);

  res.json({ok:true});
}