import { browser, db } from 'hatchable';
import { getAppAccess } from '../lib/access.js';

export const access='user';
export const methods=['GET'];

export default async function(req,res){
 const app=await getAppAccess(req);
 if(!app||!['owner','manager'].includes(app.access_type)){
   return res.status(403).json({error:'Only Owner and Manager can generate PDF reports.'});
 }
 const id=req.query?.id;
 if(!id)return res.status(400).json({error:'Evaluation id is required.'});
 const exists=await db.query('SELECT id FROM player_evaluations WHERE id=$1 LIMIT 1',[id]);
 if(!exists.rows.length)return res.status(404).json({error:'Evaluation not found.'});
 const token=crypto.randomUUID();
 await db.query("INSERT INTO report_pdf_tokens (token,evaluation_id,expires_at) VALUES ($1,$2,now()+interval '5 minutes')",[token,id]);
 const base='https://msa-academy-manager.hatchable.site/api/evaluation-report-render?token='+encodeURIComponent(token)+'&render_version=266';
 try{
   const bytes=await browser.pdf(base,{width:'200mm',height:'300mm',printBackground:true});
   res.setHeader('content-type','application/pdf');
   res.setHeader('content-disposition','attachment; filename="MSA_Player_Evaluation_Report_v266.pdf"');
   return res.send(bytes);
 }finally{
   await db.query('DELETE FROM report_pdf_tokens WHERE token=$1',[token]);
 }
}