import { db, admin } from 'hatchable';

export async function getAppAccess(req){
 const m=req.member||{};
 const rawEmail=m.email||m.handle;
 if(rawEmail){
  const email=String(rawEmail).trim().toLowerCase();
  const explicit=await db.query('SELECT email,access_type FROM user_access WHERE lower(email)=lower($1) AND active=true LIMIT 1',[email]);
  if(explicit.rows[0])return explicit.rows[0];
 }
 const isAdmin=await admin.check(req);
 if(isAdmin){
  const profile=await admin.profile(req);
  return {email:String(profile?.email||rawEmail||'').trim().toLowerCase(),access_type:'owner'};
 }
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