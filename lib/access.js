import { db } from 'hatchable';

export async function getAppAccess(req){
 const m=req.member||{};
 if(!m.email)return null;
 const email=String(m.email).trim().toLowerCase();
 const r=await db.query('SELECT email,access_type FROM user_access WHERE lower(email)=lower($1) AND active=true LIMIT 1',[email]);
 if(r.rows[0])return r.rows[0];
 if(m.role==='owner'||m.role==='admin')return {email,access_type:'owner'};
 return null;
}
export async function requireManager(req,res){
 const a=await getAppAccess(req);
 if(!a||!['owner','manager'].includes(a.access_type)) { res.status(403).json({error:'Manager access required'}); return null; }
 return a;
}
export async function requireOwner(req,res){
 const a=await getAppAccess(req);
 if(!a||a.access_type!=='owner') { res.status(403).json({error:'Owner access required'}); return null; }
 return a;
}