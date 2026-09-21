import { db } from 'hatchable';

export const access='public';
export const methods=['GET'];

const cfg={Tennis:{Red:['Basic grip & racket control','Forehand & backhand basics','Coordination & balance','Movement around the court','Confidence through play'],Orange:['Grip & stroke technique','Movement & footwork','Rally consistency','Basic serve & return','Game understanding'],Green:['Stroke technique','Consistency & control','Footwork & court positioning','Rally skills','Basic tactics & match play'],Yellow:['Advanced technique & shot variety','Speed & agility','Court movement & tactical awareness','Fitness & mental toughness','Match performance']},Padel:{'Rally Shots':['Forehand & backhand rallies','Control & placement','Rally consistency','Shot selection','Keeping the ball in play'],'Defense Shots':['Defensive positioning','Chiquita / soft shot','Lob technique','Recovery after defense','Turning defense into attack'],Volley:['Forehand volley','Backhand volley','Quick reactions','Net positioning','Control at the net'],Overheads:['Bandeja','Vibora','Rulo','Gancho','X3 / advanced overhead decision-making'],'Glass Shots':['Forehand glass shot','Backhand glass shot','Angles & rebounds','Wall positioning','Using the glass to create advantage']},Swimming:{Starfish:['Water confidence','Floating','Basic safety skills','Comfort in the water','Basic kicking'],Seahorse:['Breathing control','Kicking technique','Body position','Moving around the pool','Water confidence'],Crocodile:['Freestyle basics','Backstroke basics','Stroke coordination','Endurance','Body position & streamlining'],Dolphin:['Freestyle technique','Backstroke technique','Breathing technique','Endurance & distance','Turns & efficiency'],Shark:['All major strokes','Stroke efficiency','Speed & stamina','Starts & turns','Overall swimming performance']},Taekwondo:{'White Belt':['Basic movements & stances','Balance & coordination','Listening & discipline','Basic kicking','Respect & attitude'],'Yellow Belt':['Technique & control','Kicking technique','Combinations','Focus & confidence','Strength & flexibility'],'Green Belt':['Advanced combinations','Speed & accuracy','Discipline & consistency','Conditioning','Technical confidence'],'Blue Belt':['Advanced kicking techniques','Speed & reaction','Stamina & performance','Mental toughness','Technique under pressure'],'Red Belt':['Refined advanced techniques','Leadership','Competition readiness','Mental toughness','Overall performance']}};

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const skillKey=s=>s.replace(/[^a-z0-9]+/gi,'_').toLowerCase();

export default async function(req,res){
 const token=req.query?.token;
 if(!token)return res.status(400).send('Report token is required.');
 const claim=await db.query("UPDATE report_pdf_tokens SET used=true WHERE token=$1 AND used=false AND expires_at>now() RETURNING evaluation_id",[token]);
 if(!claim.rows.length)return res.status(404).send('Report link is invalid or expired.');
 const q=await db.query('SELECT e.*,p.name player_name,c.name coach_name FROM player_evaluations e JOIN players p ON p.id=e.player_id LEFT JOIN coaches c ON c.id=e.coach_id WHERE e.id=$1 LIMIT 1',[claim.rows[0].evaluation_id]);
 if(!q.rows.length)return res.status(404).send('Evaluation not found.');

 const e=q.rows[0];
 const skills=(cfg[e.sport]?.[e.level]||[]).slice(0,5);
 const scores=e.scores||{};
 const isTennis=e.sport==='Tennis';
 const rows=skills.map((s,i)=>'<div class="skill-row"><span class="num">'+(i+1)+'</span><span class="skill">'+esc(s)+'</span><span class="rating">'+esc(scores[skillKey(s)]||'—')+'</span></div>').join('');

 const html='<!doctype html><html><head><meta charset="utf-8"><style>'+
 '@page{size:200mm 300mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#222;font-family:Arial,Helvetica,sans-serif;color:#062f72}body{width:200mm;height:300mm}.page{position:relative;width:200mm;height:300mm;overflow:hidden;background:#fff url("/tennis-evaluation-bg.jpg") center top/100% 100% no-repeat}.overlay{position:absolute;inset:0}.info-mask{position:absolute;left:7.7%;top:36.6%;width:84.5%;height:9.5%;background:rgba(255,255,255,.985);border-radius:5mm}.info-grid{position:absolute;left:10%;top:38.3%;width:80%;height:6.5%;display:grid;grid-template-columns:1.1fr .9fr;grid-template-rows:repeat(3,1fr);column-gap:12mm;font-size:3.2mm;line-height:1.1}.info-cell{display:flex;align-items:center;white-space:nowrap;overflow:hidden}.info-cell b{width:27mm;font-size:3.05mm;flex:none;color:#062f72}.info-cell span{font-size:3.15mm;color:#173b70;overflow:hidden;text-overflow:ellipsis}.table-mask{position:absolute;left:5.8%;top:46.65%;width:88.4%;height:23.45%;background:#fff}.table-head{position:absolute;left:5.9%;top:46.65%;width:88.2%;height:4.15%;background:#06428d;color:#fff;border-radius:2mm 2mm 0 0;display:grid;grid-template-columns:12% 55% 33%;align-items:center;font-size:3.25mm;font-weight:900}.table-head span{text-align:center}.table-head span:nth-child(2){text-align:left;padding-left:7mm}.skill-list{position:absolute;left:5.9%;top:50.8%;width:88.2%;height:19.25%;font-size:3.1mm}.skill-row{height:20%;display:grid;grid-template-columns:12% 55% 33%;align-items:center;border-bottom:.25mm solid #d7dee7}.skill-row span{text-align:center}.skill-row .skill{text-align:left;padding-left:7mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.skill-row .rating{font-weight:900}.overall-mask{position:absolute;left:5.9%;top:65.0%;width:88.2%;height:4.0%;background:#ffd01a;border-radius:0 0 2mm 2mm;display:flex;align-items:center;justify-content:space-between;padding:0 7mm;font-size:4mm;font-weight:900}.overall-mask strong{font-size:5.2mm}.feedback-mask{position:absolute;left:6.6%;top:74.25%;width:86.8%;height:8.0%;background:#eef5fb;border:.25mm solid #b9cbe0;border-radius:3mm;padding:4mm 5mm;font-size:3.8mm;color:#173b70}.feedback-title{position:absolute;left:7.8%;top:71.25%;font-size:5.2mm;font-weight:900}.academy-logo-cover{position:absolute;left:3.5%;top:2.2%;width:23%;height:13.5%;background:#68a8c7;z-index:4}.academy-logo{position:absolute;left:5%;top:3.0%;width:18%;height:11%;object-fit:contain;z-index:5}.sport-title{position:absolute;left:6.5%;top:23.0%;font-size:14mm;line-height:.9;font-weight:900;color:#fff;text-shadow:1mm 1mm 0 rgba(0,0,0,.25)}.ribbon-mask{position:absolute;left:5.1%;top:30.0%;width:53%;height:4.8%;background:#ffd01a;transform:rotate(-1deg);border-radius:1mm}.ribbon-text{position:absolute;left:7%;top:30.7%;font-size:4.3mm;font-weight:900;color:#062f72;transform:rotate(-1deg)}'+
 '</style></head><body><div class="page"><div class="overlay"><div class="academy-logo-cover"></div><img class="academy-logo" src="/msa-logo.svg" alt="MSA Academy">'+
 (isTennis?'':'<div class="sport-title">'+esc(e.sport||'TENNIS').toUpperCase()+'</div><div class="ribbon-mask"></div><div class="ribbon-text">PLAYER EVALUATION REPORT</div>')+
 '<div class="info-mask"></div><div class="info-grid">'+
 '<div class="info-cell"><b>PLAYER NAME:</b><span>'+esc(e.player_name)+'</span></div>'+
 '<div class="info-cell"><b>DATE:</b><span>'+esc(e.evaluation_date)+'</span></div>'+
 '<div class="info-cell"><b>SPORT:</b><span>'+esc(e.sport)+'</span></div>'+
 '<div class="info-cell"><b>COACH:</b><span>'+esc(e.coach_name||'MSA Coach')+'</span></div>'+
 '<div class="info-cell"><b>LEVEL:</b><span>'+esc(e.level||'')+'</span></div>'+
 '<div></div></div>'+
 '<div class="table-mask"></div><div class="table-head"><span>#</span><span>SKILL</span><span>RATING (1-5)</span></div><div class="skill-list">'+rows+'</div>'+
 '<div class="overall-mask"><span>OVERALL PERFORMANCE</span><strong>'+esc(e.overall_rating||'—')+'</strong></div>'+
 '<div class="feedback-title">COACH FEEDBACK</div><div class="feedback-mask">'+esc(e.comments||'No written feedback provided.')+'</div>'+
 '</div></div></body></html>';

 res.setHeader('content-type','text/html; charset=utf-8');
 return res.send(html);
}