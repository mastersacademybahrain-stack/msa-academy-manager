import { db } from 'hatchable';
import { requireOwner } from '../lib/access.js';
export const access='user'; export const methods=['GET','POST','DELETE'];
export default async function(req,res){
 if(!(await requireOwner(req,res)))return;
 if(req.method==='GET'){
  const r=await db.query("SELECT id,email,access_type,active,created_at,updated_at FROM user_access WHERE active=true ORDER BY access_type,email");
  return res.json(r.rows);
 }
 const {email,access_type}=req.body||{};
 if(req.method==='POST'){
  const e=String(email||'').trim().toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))return res.status(400).json({error:'Enter a valid email'});
  if(!['manager','coach'].includes(access_type))return res.status(400).json({error:'Access type must be manager or coach'});
  const r=await db.query("WITH invite AS (INSERT INTO invited_users(email) VALUES($1) ON CONFLICT(email) DO NOTHING) INSERT INTO user_access(email,access_type,active,updated_at) VALUES($1,$2,true,now()) ON CONFLICT(email) DO UPDATE SET access_type=EXCLUDED.access_type,active=true,updated_at=now() RETURNING id,email,access_type,active",[e,access_type]);
  return res.json(r.rows[0]);
 }
 const id=req.body?.id||req.query?.id;
 if(!id)return res.status(400).json({error:'Access record required'});
 const accessRow=await db.query('SELECT email FROM user_access WHERE id=$1 LIMIT 1',[id]);
 if(!accessRow.rows[0])return res.status(404).json({error:'Access record not found'});
 await db.query('UPDATE user_access SET active=false,updated_at=now() WHERE id=$1',[id]);
 await db.query('DELETE FROM invited_users WHERE lower(email)=lower($1)',[accessRow.rows[0].email]);
 res.json({ok:true});
}