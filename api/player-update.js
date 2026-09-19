import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const {id,name,date_of_birth=null,passport_cpr='',guardian_contact='',address='',gender=null,nationality=''}=req.body||{};
 if(!id||!name||!String(name).trim())return res.status(400).json({error:'Player name is required'});
 const r=await db.query('UPDATE players SET name=$1,date_of_birth=$2,passport_cpr=$3,guardian_contact=$4,address=$5,gender=$6,nationality=$7 WHERE id=$8 RETURNING id,name,sport,level,tennis_categories,date_of_birth,passport_cpr,guardian_contact,address,gender,nationality',[String(name).trim(),date_of_birth||null,passport_cpr||'',guardian_contact||'',address||'',gender||null,nationality||'',id]);
 if(!r.rows.length)return res.status(404).json({error:'Player not found'});
 res.json(r.rows[0]);
}