import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const {id,name,sports,sport}=req.body||{};
 const selected=[...new Set((Array.isArray(sports)?sports:(sport?[sport]:[])).filter(Boolean))];
 if(!id||!name||!selected.length)return res.status(400).json({error:'Coach, name and at least one sport are required'});
 const x=await db.query('UPDATE coaches SET name=$1,sport=$2,sports=$3 WHERE id=$4 AND active=true RETURNING id,name,sport,sports',[name,selected[0],selected,id]);
 if(!x.rows.length)return res.status(404).json({error:'Coach not found'});
 res.json(x.rows[0]);
}