import { browser } from 'hatchable';

export const access='public';
export const methods=['GET'];

export default async function(req,res){
 const token=req.query?.token;
 if(!token)return res.status(400).send('Report token is required.');
 const renderUrl='https://msa-academy-manager.hatchable.site/api/evaluation-report-render?token='+encodeURIComponent(token);
 try{
   const bytes=await browser.pdf(renderUrl,{width:'200mm',height:'300mm',printBackground:true});
   res.setHeader('content-type','application/pdf');
   res.setHeader('content-disposition','attachment; filename="MSA_Player_Evaluation_Report.pdf"');
   return res.send(bytes);
 }catch(err){
   console.error('evaluation-report-pdf-public',err);
   return res.status(500).send('PDF generation failed.');
 }
}