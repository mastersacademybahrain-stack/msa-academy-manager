import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const {name,date_of_birth=null,passport_cpr='',guardian_contact='',address=''}=req.body||{};
 if(!name||!String(name).trim())return res.status(400).json({error:'Player name is required'});
 const r=await db.query('INSERT INTO players(name,sport,level,tennis_categories,date_of_birth,passport_cpr,guardian_contact,address) VALUES($1,NULL,$2,$3,$4,$5,$6,$7) RETURNING id,name,sport,level,tennis_categories,date_of_birth,passport_cpr,guardian_contact,address',[String(name).trim(),'','{}',date_of_birth||null,passport_cpr||'',guardian_contact||'',address||'']);
 res.json(r.rows[0]);
}