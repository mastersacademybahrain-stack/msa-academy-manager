import { db, auth } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;const user=req.member||{};const {name,sports,sport}=req.body||{};const selected=[...new Set((Array.isArray(sports)?sports:(sport?[sport]:[])).filter(Boolean))];if(!name||!selected.length)return res.status(400).json({error:'Coach name and at least one sport are required'});const x=await db.query('INSERT INTO coaches(name,sport,sports) VALUES($1,$2,$3) RETURNING id,name,sport,sports',[name,selected[0],selected]);res.json(x.rows[0]);}