import { db } from 'hatchable';

export const access='public';
export const methods=['GET'];

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export default async function(req,res){
  const token=req.query?.token;
  if(!token)return res.status(400).send('Report token is required.');
  const claim=await db.query("UPDATE report_pdf_tokens SET used=true WHERE token=$1 AND used=false AND expires_at>now() RETURNING evaluation_id",[token]);
  if(!claim.rows.length)return res.status(404).send('Report link is invalid or expired.');
  const q=await db.query('SELECT e.*,p.name player_name,c.name coach_name FROM player_evaluations e JOIN players p ON p.id=e.player_id LEFT JOIN coaches c ON c.id=e.coach_id WHERE e.id=$1 LIMIT 1',[claim.rows[0].evaluation_id]);
  if(!q.rows.length)return res.status(404).send('Evaluation not found.');
  const e=q.rows[0],scores=e.scores||{};
  const rows=Object.entries(scores).map(([k,v])=>'<tr><td>'+esc(k.replace(/_/g,' '))+'</td><td>'+esc(v)+'/5</td></tr>').join('');
  const html='<!doctype html><html><head><meta charset="utf-8"><style>@page{size:210mm 297mm;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#222}.page{width:210mm;min-height:297mm;padding:18mm;background:#fff}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:8mm}td{border:1px solid #ddd;padding:3mm}.note{color:#666}.box{padding:5mm;border:1px solid #ddd;margin-top:10mm}</style></head><body><div class="page"><h1>MSA Player Evaluation</h1><div class="note">Previous evaluation template removed. New design pending.</div><div class="box"><b>Player:</b> '+esc(e.player_name)+'<br><b>Sport:</b> '+esc(e.sport)+'<br><b>Level:</b> '+esc(e.level)+'<br><b>Coach:</b> '+esc(e.coach_name||'MSA Coach')+'<br><b>Date:</b> '+esc(e.evaluation_date||'')+'</div><table><tr><th>Skill</th><th>Rating</th></tr>'+rows+'<tr><td><b>Overall Performance</b></td><td><b>'+esc(e.overall_rating||'—')+'/5</b></td></tr></table><div class="box"><b>Coach Feedback</b><p>'+esc(e.comments||'')+'</p></div></div></body></html>';
  res.setHeader('X-MSA-Report-Renderer','clean-slate-evaluation');
  res.setHeader('content-type','text/html; charset=utf-8');
  return res.send(html);
}