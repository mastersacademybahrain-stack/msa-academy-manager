import { db } from 'hatchable';
export const access='admin'; export const methods=['POST'];
export default async function(req,res){
 const {id}=req.body||{};
 if(!id)return res.status(400).json({error:'Coach required'});
 const x=await db.query('UPDATE coaches SET active=false WHERE id=$1 AND active=true RETURNING id',[id]);
 if(!x.rows.length)return res.status(404).json({error:'Coach not found'});
 res.json({ok:true});
}