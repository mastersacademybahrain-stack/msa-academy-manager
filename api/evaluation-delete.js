import { db } from 'hatchable';
import { getAppAccess } from '../lib/access.js';

export const access='user';
export const methods=['DELETE','POST'];

export default async function(req,res){
 const app=await getAppAccess(req);
 if(!app || !['owner','manager'].includes(app.access_type)) return res.status(403).json({error:'Only Owner and Manager can delete evaluation reports.'});
 const id=req.body?.id||req.query?.id;
 if(!id)return res.status(400).json({error:'Evaluation id is required.'});
 const q=await db.query('DELETE FROM player_evaluations WHERE id=$1 RETURNING id',[id]);
 if(!q.rows.length)return res.status(404).json({error:'Evaluation not found.'});
 return res.json({ok:true,id});
}