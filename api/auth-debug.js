import { db, admin } from 'hatchable';
import { getAppAccess } from '../lib/access.js';
export const access='member'; export const methods=['GET'];
export default async function(req,res){
 const m=req.member||{};
 const safe={email:m.email||null,handle:m.handle||null,id:m.id||null,user_id:m.user_id||null,userId:m.userId||null,hatchable_user_id:m.hatchable_user_id||null,google_sub:m.google_sub||null};
 let adminCheck=null,profile=null,profileEmail=null,access=null;
 try{adminCheck=await admin.check(req)}catch(e){adminCheck='error'}
 try{profile=await admin.profile(req)}catch(e){profile=null}
 profileEmail=profile?.email||null;
 try{access=await getAppAccess(req)}catch(e){access={error:String(e?.message||e)}}
 const candidates=Object.values(safe).filter(Boolean).map(String);
 const matches=[];
 for(const c of candidates){const q=await db.query('SELECT email,access_type,active FROM user_access WHERE lower(email)=lower($1) LIMIT 5',[c]);if(q.rows.length)matches.push({candidate:c,rows:q.rows})}
 res.json({member:safe,adminCheck,adminProfileEmail:profileEmail,resolvedAccess:access,userAccessMatches:matches});
}