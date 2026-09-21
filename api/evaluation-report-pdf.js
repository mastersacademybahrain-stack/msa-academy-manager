import { browser, db } from 'hatchable';
import { getAppAccess } from '../lib/access.js';
export const access='user'; export const methods=['GET'];

function b64(bytes){let s='';const n=32768;for(let i=0;i<bytes.length;i+=n)s+=String.fromCharCode(...bytes.subarray(i,Math.min(i+n,bytes.length)));return btoa(s)}

export default async function(req,res){
  const app=await getAppAccess(req);
  if(!app||!['owner','manager'].includes(app.access_type))return res.status(403).json({error:'Only Owner and Manager can generate PDF reports.'});
  const id=req.query?.id;
  if(!id)return res.status(400).json({error:'Evaluation id is required.'});

  const exists=await db.query('SELECT id FROM player_evaluations WHERE id=$1 LIMIT 1',[id]);
  if(!exists.rows.length)return res.status(404).json({error:'Evaluation not found.'});

  const token=crypto.randomUUID();
  await db.query("INSERT INTO report_pdf_tokens (token,evaluation_id,expires_at) VALUES ($1,$2,now()+interval '5 minutes')",[token,id]);

  const base='https://msa-academy-manager.hatchable.site/evaluation-report.html?token='+encodeURIComponent(token)+'&v=245';
  try{
    const bytes=await browser.pdf(base,{format:'A4',printBackground:true});
    return res.json({ok:true,filename:'MSA_Player_Evaluation_Report.pdf',pdf:b64(bytes)});
  }finally{
    await db.query('DELETE FROM report_pdf_tokens WHERE token=$1',[token]);
  }
}