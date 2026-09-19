import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const {id,name,date_of_birth=null,passport_cpr='',guardian_contact='',address=''}=req.body||{};
 if(!id||!name||!String(name).trim())return res.status(400).json({error:'Player name is required'});
 const r=await db.query('UPDATE players SET name=$1,date_of_birth=$2,passport_cpr=$3,guardian_contact=$4,address=$5 WHERE id=$6 RETURNING id,name,sport,level,tennis_categories,date_of_birth,passport_cpr,guardian_contact,address',[String(name).trim(),date_of_birth||null,passport_cpr||'',guardian_contact||'',address||'',id]);
 if(!r.rows.length)return res.status(404).json({error:'Player not found'});
 res.json(r.rows[0]);
}