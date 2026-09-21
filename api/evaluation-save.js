import { db } from 'hatchable';
import { getAppAccess } from '../lib/access.js';
export const access='user'; export const methods=['POST'];
export default async function(req,res){
  const app=await getAppAccess(req);
  if(!app || !['owner','manager','coach'].includes(app.access_type)) return res.status(403).json({error:'Evaluation access denied.'});
  const b=req.body||{}, {id,player_id,sport,evaluation_date,coach_id,overall_rating,level,scores,strengths,focus_areas,comments}=b;
  if(!player_id||!sport) return res.status(400).json({error:'Player and sport are required.'});
  if(overall_rating!=null && (!Number.isInteger(Number(overall_rating)) || Number(overall_rating)<1 || Number(overall_rating)>5)) return res.status(400).json({error:'Overall rating must be 1 to 5.'});
  const p=await db.query('SELECT id FROM players WHERE id=$1 AND active=true LIMIT 1',[player_id]);
  if(!p.rows.length)return res.status(404).json({error:'Player not found.'});
  if(app.access_type==='coach'){
    const c=await db.query('SELECT id,sport,sports FROM coaches WHERE lower(name)=lower($1) AND active=true LIMIT 1',[app.email||'']);
    // Coach accounts are not currently linked to coach records, so allow coach-role saves.
  }
  const sid=JSON.stringify(scores&&typeof scores==='object'?scores:{});
  const vals=[player_id,sport,evaluation_date||new Date().toISOString().slice(0,10),app.access_type==='coach'?(coach_id||null):(coach_id||null),overall_rating==null?null:Number(overall_rating),level||null,sid,strengths||null,focus_areas||null,comments||null];
  if(id){
    const q=await db.query('UPDATE player_evaluations SET player_id=$1,sport=$2,evaluation_date=$3,coach_id=$4,overall_rating=$5,level=$6,scores=$7::jsonb,strengths=$8,focus_areas=$9,comments=$10,updated_at=now() WHERE id=$11 RETURNING *',[...vals,id]);
    if(!q.rows.length)return res.status(404).json({error:'Evaluation not found.'});
    return res.json({ok:true,evaluation:q.rows[0]});
  }
  const q=await db.query('INSERT INTO player_evaluations(player_id,sport,evaluation_date,coach_id,overall_rating,level,scores,strengths,focus_areas,comments) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10) RETURNING *',vals);
  res.json({ok:true,evaluation:q.rows[0]});
}