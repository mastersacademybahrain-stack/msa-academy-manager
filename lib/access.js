import { db, admin } from 'hatchable';

export async function getAppAccess(req){
 const m=req.member||{};
 const candidates=[m.email,m.handle,m.id,m.user_id,m.userId,m.hatchable_user_id,m.google_sub,req.user?.email,req.user?.id,req.auth?.email,req.auth?.user_id]
  .filter(v=>v!==undefined&&v!==null&&String(v).trim()!=='')
  .map(v=>String(v).trim());
 for(const candidate of candidates){
  const explicit=await db.query('SELECT email,access_type FROM user_access WHERE lower(email)=lower($1) AND active=true LIMIT 1',[candidate]);
  if(explicit.rows[0])return explicit.rows[0];
 }
 for(const candidate of candidates){
  const u=await db.query('SELECT email FROM users WHERE lower(email)=lower($1) OR id=$1 OR hatchable_user_id=$1 OR google_sub=$1 LIMIT 1',[candidate]);
  if(u.rows[0]){
   const explicit=await db.query('SELECT email,access_type FROM user_access WHERE lower(email)=lower($1) AND active=true LIMIT 1',[u.rows[0].email]);
   if(explicit.rows[0])return explicit.rows[0];
  }
 }
 const isAdmin=await admin.check(req);
 if(isAdmin){
  const profile=await admin.profile(req);
  const email=String(profile?.email||m.email||m.handle||'').trim().toLowerCase();
  const explicit=await db.query('SELECT email,access_type FROM user_access WHERE lower(email)=lower($1) AND active=true LIMIT 1',[email]);
  if(explicit.rows[0])return explicit.rows[0];
  return {email,access_type:'owner'};
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