import { db, auth } from 'hatchable';

const OWNER_EMAIL='mastersacademybahrain@gmail.com';

export async function getAppAccess(req){
 const u=await auth.getUser(req);
 if(!u?.email)return null;
 const email=String(u.email).trim().toLowerCase();
 const explicit=await db.query('SELECT email,access_type FROM user_access WHERE lower(email)=lower($1) AND active=true LIMIT 1',[email]);
 if(explicit.rows[0])return explicit.rows[0];
 if(email===OWNER_EMAIL)return {email,access_type:'owner'};
 return null;
}
export async function requireManager(req,res){
 const a=await getAppAccess(req);
 if(!a||!['owner','manager'].includes(a.access_type)) { res.status(403).json({error:'Manager access required'}); return null; }
 return a;
}
export async function requireAttendanceAccess(req,res){
 const a=await getAppAccess(req);
 if(!a||!['owner','manager','coach'].includes(a.access_type)) { res.status(403).json({error:'Attendance access required'}); return null; }
 return a;
}
export async function requireOwner(req,res){
 const a=await getAppAccess(req);
 if(!a||a.access_type!=='owner') { res.status(403).json({error:'Owner access required'}); return null; }
 return a;
}