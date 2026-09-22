import { db, storage } from 'hatchable';

export const access='public';
export const methods=['GET'];

const swimming={
  Starfish:{skills:['Water confidence','Floating','Basic safety skills','Comfort in the water','Basic kicking'],color:'#ef3f78'},
  Seahorse:{skills:['Breathing control','Kicking technique','Body position','Moving around the pool','Water confidence'],color:'#f47b20'},
  Crocodile:{skills:['Freestyle basics','Backstroke basics','Stroke coordination','Endurance','Body position & streamlining'],color:'#159447'},
  Dolphin:{skills:['Freestyle technique','Backstroke technique','Breathing technique','Endurance & distance','Turns & efficiency'],color:'#118ad1'},
  Shark:{skills:['All major strokes','Stroke efficiency','Speed & stamina','Starts & turns','Overall swimming performance'],color:'#5b2ca0'}
};

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=s=>String(s??'').replace(/[^a-z0-9]+/gi,'_').toLowerCase();

function dataUri(item,fallback){
  const b=new Uint8Array(item?.buffer||[]);
  if(!b.length)throw new Error('Template asset is missing.');
  let bin='';
  for(let i=0;i<b.length;i+=0x8000)bin+=String.fromCharCode(...b.subarray(i,i+0x8000));
  return 'data:'+(item.contentType||fallback)+';base64,'+btoa(bin);
}
async function asset(path,fallback){ return dataUri(await storage.get(path),fallback); }

export default async function(req,res){
  const token=req.query?.token;
  if(!token)return res.status(400).send('Report token is required.');
  const claim=await db.query("UPDATE report_pdf_tokens SET used=true WHERE token=$1 AND used=false AND expires_at>now() RETURNING evaluation_id",[token]);
  if(!claim.rows.length)return res.status(404).send('Report link is invalid or expired.');
  const q=await db.query('SELECT e.*,p.name player_name,c.name coach_name FROM player_evaluations e JOIN players p ON p.id=e.player_id LEFT JOIN coaches c ON c.id=e.coach_id WHERE e.id=$1 LIMIT 1',[claim.rows[0].evaluation_id]);
  if(!q.rows.length)return res.status(404).send('Evaluation not found.');
  const e=q.rows[0], sport=String(e.sport||'');
  if(sport!=='Swimming')return res.status(400).send('Only the approved Swimming template is currently deployed.');
  const level=String(e.level||''), cfg=swimming[level];
  if(!cfg)return res.status(400).send('Swimming level is not configured.');

  const template=await asset('evaluation-templates/swimming/master-template.jpg','image/jpeg');
  const logo=await asset('evaluation-templates/msa-logo-official.png','image/png');
  const levelArt=await asset('evaluation-templates/swimming/levels/'+key(level)+'.svg','image/svg+xml');
  const scores=e.scores||{};
  const rows=cfg.skills.map((skill,i)=>{
    const n=Number(scores[key(skill)]||0);
    return '<div class="skill"><div class="n">'+(i+1)+'</div><div>'+esc(skill)+'</div><div class="dots">'+[1,2,3,4,5].map(v=>'<i class="'+(v<=n?'on':'')+'"></i>').join('')+'</div></div>';
  }).join('');
  const date=e.evaluation_date?String(e.evaluation_date).slice(0,10):'', overall=Number(e.overall_rating||0), feedback=e.comments||'';
  const html='<!doctype html><html><head><meta charset="utf-8"><style>'+
  '@page{size:210mm 297mm;margin:0}*{box-sizing:border-box}html,body{margin:0;width:210mm;height:297mm;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#182c55}.page{position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff}.template{position:absolute;inset:0;width:100%;height:100%;object-fit:fill}.brandlogo{position:absolute;left:10mm;top:6mm;width:25mm;height:25mm;object-fit:contain;z-index:3}.content{position:absolute;left:11mm;right:11mm;top:149mm;height:118mm;z-index:5}.topline{display:grid;grid-template-columns:1.15fr .85fr;gap:4mm;align-items:start}.details{background:rgba(255,255,255,.97);border-radius:4mm;padding:4mm 5mm;border:.35mm solid #d7e3f0;box-shadow:0 2mm 5mm rgba(24,44,85,.12)}.title{font-size:5mm;font-weight:900;color:#4b248e;margin-bottom:3mm}.fields{display:grid;grid-template-columns:1fr 1fr;gap:2.5mm 5mm}.field b{display:block;font-size:2.4mm;color:#765f9d}.field span{display:block;font-size:3.5mm;font-weight:800;color:#182c55;margin-top:.6mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.level{background:rgba(255,255,255,.98);border-radius:4mm;padding:3mm;border:.45mm solid var(--level-color);display:grid;grid-template-columns:29mm 1fr;gap:3mm;align-items:center;min-height:39mm}.level img{width:28mm;height:28mm;object-fit:contain}.level .small{font-size:2.4mm;color:#6a5b84;font-weight:800}.level h2{font-size:4.5mm;color:var(--level-color);margin:1mm 0 0;text-transform:uppercase}.skillsbox{margin-top:4mm;background:rgba(255,255,255,.98);border-radius:4mm;border:.35mm solid #d7e3f0;overflow:hidden}.skillhead{display:grid;grid-template-columns:7% 55% 38%;background:#4b248e;color:#fff;padding:2.7mm 3mm;font-size:2.8mm;font-weight:900}.skillhead div:last-child{text-align:center}.skill{display:grid;grid-template-columns:7% 55% 38%;align-items:center;min-height:7.2mm;padding:0 3mm;border-top:.25mm solid #e2e8f0;font-size:2.8mm}.skill:nth-child(even){background:#fafbfd}.skill .n{text-align:center;font-weight:900}.dots{display:flex;justify-content:center;gap:2mm}.dots i{width:4.2mm;height:4.2mm;border-radius:50%;background:#e5eaf0}.dots i.on{background:#f4b72b}.overall{display:grid;grid-template-columns:1fr 20mm;background:#f4b72b;color:#241650;padding:2.5mm 3mm;font-size:3.2mm;font-weight:900}.overall b{text-align:center;font-size:4.4mm}.feedback{margin-top:4mm;background:rgba(255,255,255,.98);border-radius:4mm;border:.35mm solid #d7e3f0;padding:3mm 4mm;min-height:19mm}.feedback b{display:block;color:#4b248e;font-size:3mm;margin-bottom:1.5mm}.feedback p{margin:0;font-size:2.8mm;line-height:1.3;color:#263b60}</style></head><body><div class="page"><img class="template" src="'+template+'"><img class="brandlogo" src="'+logo+'"><div class="content"><div class="topline"><div class="details"><div class="title">PLAYER DETAILS</div><div class="fields"><div class="field"><b>PLAYER NAME</b><span>'+esc(e.player_name)+'</span></div><div class="field"><b>SPORT</b><span>'+esc(sport)+'</span></div><div class="field"><b>LEVEL</b><span>'+esc(level)+'</span></div><div class="field"><b>DATE</b><span>'+esc(date)+'</span></div><div class="field"><b>COACH</b><span>'+esc(e.coach_name||'MSA Coach')+'</span></div></div></div><div class="level" style="--level-color:'+cfg.color+'"><img src="'+levelArt+'"><div><div class="small">CURRENT SWIMMING LEVEL</div><h2>'+esc(level)+'</h2></div></div></div><div class="skillsbox"><div class="skillhead"><div>#</div><div>SKILL</div><div>RATING</div></div>'+rows+'<div class="overall"><span>OVERALL PERFORMANCE</span><b>'+esc(overall||'—')+'/5</b></div></div><div class="feedback"><b>COACH FEEDBACK</b><p>'+esc(feedback||'No written feedback provided.')+'</p></div></div></div></body></html>';
  res.setHeader('X-MSA-Report-Renderer','msa-template-v1');
  res.setHeader('content-type','text/html; charset=utf-8');
  return res.send(html);
}