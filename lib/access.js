import { db, admin } from 'hatchable';

export async function getAppAccess(req){
 const isAdmin=await admin.check(req);
 if(isAdmin){
  const profile=await admin.profile(req);
  return {email:String(profile?.email||req.member?.email||req.member?.handle||'').trim().toLowerCase(),access_type:'owner'};
 }
 const m=req.member||{};
 const rawEmail=m.email||m.handle;
 if(!rawEmail)return null;
 const email=String(rawEmail).trim().toLowerCase();
 const r=await db.query('SELECT email,access_type FROM user_access WHERE lower(email)=lower($1) AND active=true LIMIT 1',[email]);
 return r.rows[0]||null;
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