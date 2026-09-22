import { db, storage } from 'hatchable';

export const access='public';
export const methods=['GET'];

const skillsBySport={
  Tennis:{
    Red:['Basic grip & racket control','Forehand & backhand basics','Coordination & balance','Movement around the court','Confidence through play'],
    Orange:['Grip & stroke technique','Movement & footwork','Rally consistency','Basic serve & return','Game understanding'],
    Green:['Stroke technique','Consistency & control','Footwork & court positioning','Rally skills','Basic tactics & match play'],
    Yellow:['Advanced technique & shot variety','Speed & agility','Court movement & tactical awareness','Fitness & mental toughness','Match performance'],
    Veteran:['Technique & consistency','Movement & footwork','Rally quality','Serve & return','Match performance'],
    Private:['Technique & control','Movement & footwork','Consistency','Serve & return','Match performance']
  },
  Swimming:{
    Starfish:['Water confidence','Floating','Basic safety skills','Comfort in the water','Basic kicking'],
    Seahorse:['Breathing control','Kicking technique','Body position','Moving around the pool','Water confidence'],
    Crocodile:['Freestyle basics','Backstroke basics','Stroke coordination','Endurance','Body position & streamlining'],
    Dolphin:['Freestyle technique','Backstroke technique','Breathing technique','Endurance & distance','Turns & efficiency'],
    Shark:['All major strokes','Stroke efficiency','Speed & stamina','Starts & turns','Overall swimming performance']
  },
  'Water Polo':{
    Beginner:['Water polo basics','Ball control','Eggbeater movement','Passing & receiving','Team awareness'],
    Intermediate:['Ball handling','Passing accuracy','Positioning','Defensive movement','Game awareness'],
    Advanced:['Tactical positioning','Shooting & finishing','Defensive pressure','Transitions','Match performance']
  },
  Padel:{
    'Rally Shots':['Forehand & backhand rallies','Control & placement','Rally consistency','Shot selection','Keeping the ball in play'],
    'Defense Shots':['Defensive positioning','Chiquita / soft shot','Lob technique','Recovery after defense','Turning defense into attack'],
    Volley:['Forehand volley','Backhand volley','Quick reactions','Net positioning','Control at the net'],
    Overheads:['Bandeja','Vibora','Rulo','Gancho','Advanced overhead decision-making'],
    'Glass Shots':['Forehand glass shot','Backhand glass shot','Angles & rebounds','Wall positioning','Using the glass to create advantage']
  },
  Taekwondo:{
    'White Belt':['Basic movements & stances','Balance & coordination','Listening & discipline','Basic kicking','Respect & attitude'],
    'Yellow Belt':['Technique & control','Kicking technique','Combinations','Focus & confidence','Strength & flexibility'],
    'Green Belt':['Advanced combinations','Speed & accuracy','Discipline & consistency','Conditioning','Technical confidence'],
    'Blue Belt':['Advanced kicking techniques','Speed & reaction','Stamina & performance','Mental toughness','Technique under pressure'],
    'Red Belt':['Refined advanced techniques','Leadership','Competition readiness','Mental toughness','Overall performance']
  },
  Fitness:{
    Kids:['Movement quality','Coordination','Cardio endurance','Agility','Confidence'],
    Juniors:['Movement quality','Cardio endurance','Agility & speed','Coordination','Overall fitness'],
    Private:['Movement quality','Cardio endurance','Agility','Strength endurance','Overall fitness']
  }
};

const levelMeta={
  Red:{color:'#d71920',soft:'#fff0f0',tag:'FOUNDATIONS',desc:'LEARN THE BASICS'},
  Orange:{color:'#f26b16',soft:'#fff3ea',tag:'BUILDING SKILLS',desc:'DEVELOP YOUR GAME'},
  Green:{color:'#169c3a',soft:'#effaf0',tag:'ADVANCING',desc:'PLAY WITH CONFIDENCE'},
  Yellow:{color:'#f4c400',soft:'#fffbe8',tag:'PERFORMANCE',desc:'TAKE YOUR GAME FURTHER'},
  Starfish:{color:'#00a6c8',soft:'#e9fbff',tag:'WATER CONFIDENCE',desc:'FEEL SAFE & COMFORTABLE'},
  Seahorse:{color:'#1976d2',soft:'#edf5ff',tag:'WATER SKILLS',desc:'BUILD CONTROL & BREATHING'},
  Crocodile:{color:'#00a65a',soft:'#edfff6',tag:'STROKE FOUNDATIONS',desc:'BUILD STROKE SKILLS'},
  Dolphin:{color:'#0066cc',soft:'#edf5ff',tag:'STROKE DEVELOPMENT',desc:'SWIM WITH CONFIDENCE'},
  Shark:{color:'#123d72',soft:'#eef4fb',tag:'PERFORMANCE',desc:'TAKE YOUR SWIMMING FURTHER'}
};

const levelImages={
  Starfish:'/level-swimming-starfish.svg',Seahorse:'/level-swimming-seahorse.svg',Crocodile:'/level-swimming-crocodile.svg',
  Dolphin:'/level-swimming-dolphin.svg',Shark:'/level-swimming-shark.svg',
  Red:'/level-tennis-red.svg',Orange:'/level-tennis-orange.svg',Green:'/level-tennis-green.svg',Yellow:'/level-tennis-yellow.svg'
};

// The ONLY hero assets permitted in this report generator.
const selectedHeroKeys={
  Tennis:'evaluation-report/selected/tennis-option2.webp',
  Swimming:'evaluation-report/selected/swimming-option2.jpg'
};

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const key=s=>String(s??'').replace(/[^a-z0-9]+/gi,'_').toLowerCase();

function toDataUri_legacy_disabled(item,mime){
  if(!item?.buffer)throw new Error('Selected report image is missing.');
  const bytes=new Uint8Array(item.buffer);
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  // Explicit MIME type: do not depend on storage metadata when generating PDF data URIs.
  return 'data:'+(mime||'image/jpeg')+';base64,'+btoa(binary);
}

export default async function(req,res){
  const token=req.query?.token;
  if(!token)return res.status(400).send('Report token is required.');

  const claim=await db.query(
    "UPDATE report_pdf_tokens SET used=true WHERE token=$1 AND used=false AND expires_at>now() RETURNING evaluation_id",
    [token]
  );
  if(!claim.rows.length)return res.status(404).send('Report link is invalid or expired.');

  const q=await db.query(
    'SELECT e.*,p.name player_name,c.name coach_name FROM player_evaluations e JOIN players p ON p.id=e.player_id LEFT JOIN coaches c ON c.id=e.coach_id WHERE e.id=$1 LIMIT 1',
    [claim.rows[0].evaluation_id]
  );
  if(!q.rows.length)return res.status(404).send('Evaluation not found.');

  const e=q.rows[0];
  const sport=String(e.sport||'');
  const level=String(e.level||'');
  const heroKey=selectedHeroKeys[sport];

  let hero='';
  if(heroKey){
    const image=await storage.get(heroKey);
    if(!image?.buffer)return res.status(500).send('Selected '+sport+' Option 2 report image is missing.');
    hero='https://msa-academy-manager.hatchable.site/api/evaluation-report-image?sport='+encodeURIComponent(sport.toLowerCase())+'&v=305';
  }

  const skills=(skillsBySport[sport]?.[level]||[]).slice(0,5);
  const scores=e.scores||{};
  const overall=Number(e.overall_rating||0);
  const date=e.evaluation_date?String(e.evaluation_date).slice(0,10):'';
  const lv=levelMeta[level]||{color:'#123d72',soft:'#f2f6fb',tag:'PLAYER LEVEL',desc:'PLAY LEARN GROW'};
  const levelImage=levelImages[level]||'';
  const rows=skills.map((s,i)=>{
    const n=Number(scores[key(s)]||0);
    return '<div class="skill"><div class="num">'+(i+1)+'</div><div class="skillname">'+esc(s)+'</div><div class="dots">'+[1,2,3,4,5].map(v=>'<span class="'+(v<=n?'on':'')+'">'+v+'</span>').join('')+'</div></div>';
  }).join('');

  const feedback=e.comments||'',strengths=e.strengths||'',focus=e.focus_areas||'';
  const extra=(strengths||focus)?'<div class="twobox">'+(strengths?'<div class="mini"><h4>STRENGTHS</h4><p>'+esc(strengths)+'</p></div>':'')+(focus?'<div class="mini gold"><h4>FOCUS AREAS</h4><p>'+esc(focus)+'</p></div>':'')+'</div>':'';

  const html='<!doctype html><html><head><meta charset="utf-8"><style>'+
  '@page{size:210mm 297mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;width:210mm;height:297mm;background:#fff;font-family:Arial,Helvetica,sans-serif;color:#082d70}'+
  '.page{position:relative;width:210mm;height:297mm;overflow:hidden;background:#fff}'+
  '.photo{position:absolute;left:0;top:0;width:210mm;height:128mm;background:#eaf2f8;overflow:hidden}.option2-photo{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:fill;object-position:center center}.report-logo{position:absolute;top:7mm;right:8mm;width:25mm;height:25mm;object-fit:contain;z-index:4;filter:drop-shadow(0 1mm 1.5mm rgba(0,0,0,.28))}'+
  '.panel{position:absolute;left:8mm;right:8mm;top:131mm;z-index:10;background:rgba(255,255,255,.985);border-radius:5mm;box-shadow:0 3mm 10mm rgba(0,38,86,.18);padding:6mm 7mm 5mm}'+
  '.details{display:grid;grid-template-columns:1fr;gap:2mm;border-bottom:.3mm solid #c9d9eb;padding-bottom:4mm}.col{display:grid;gap:2.2mm}.field{display:grid;grid-template-columns:31mm 1fr;align-items:center;font-size:3.5mm;min-height:5.5mm}.field b{font-size:3.1mm;color:#063d82}.field span{font-weight:800;color:#153b70;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
  '.levelcard{position:absolute;right:7mm;top:5mm;width:76mm;height:40mm;border:.5mm solid var(--level);border-radius:4mm;background:var(--levelsoft);z-index:12;display:grid;grid-template-columns:37mm 1fr;align-items:center;padding:3mm}.ball{width:32mm;height:32mm;border-radius:50%;object-fit:cover;box-shadow:0 1mm 3mm rgba(0,0,0,.22);display:block}.levelname{font-size:5mm;font-weight:1000;color:var(--level);line-height:1}.leveltag{font-size:2.6mm;font-weight:900;color:#16396b;margin-top:2mm}.leveldesc{font-size:2.5mm;font-weight:800;color:#16396b;margin-top:2mm;line-height:1.1}'+
  '.section-title{font-size:4mm;font-weight:1000;color:#083b80;margin:4mm 0 2mm}.skills{border:1px solid #c8d9eb;border-radius:3mm;overflow:hidden}.thead{display:grid;grid-template-columns:9% 56% 35%;background:#063d80;color:#fff;padding:3mm 2mm;font-size:3.1mm;font-weight:900}.thead div:last-child{text-align:center}.skill{display:grid;grid-template-columns:9% 51% 40%;align-items:center;min-height:8.3mm;border-top:.25mm solid #d8e3ef;padding:0 2mm;font-size:3.2mm}.skill:nth-child(odd){background:#f8fbfe}.num{text-align:center}.skillname{padding-right:2mm}.dots{display:flex;justify-content:center;gap:2.5mm}.dots span{width:5.5mm;height:5.5mm;border-radius:50%;display:grid;place-items:center;background:#e8edf2;color:#718096;font-size:2.7mm;font-weight:900}.dots span.on{background:#ffd21a;color:#082d70;box-shadow:0 .5mm 1mm #b98c0040}.overall{display:grid;grid-template-columns:72% 28%;align-items:center;background:#ffd21a;padding:3.3mm 4mm;font-weight:1000;font-size:4.2mm}.overall b{text-align:center;font-size:5.4mm}'+
  '.feedback-title{font-size:4.8mm;font-weight:1000;color:#082d70;margin:5mm 0 2mm}.feedback{border:1px solid #a9c8e8;background:#f4f8fc;border-radius:3mm;padding:4mm 5mm;min-height:25mm;font-size:3.6mm;line-height:1.35;color:#153b70}.twobox{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-top:3mm}.mini{background:#f4f8fc;border:1px solid #c8d9eb;border-radius:3mm;padding:3mm 4mm;min-height:18mm}.mini.gold{background:#fff8dc;border-color:#f0d36a}.mini h4{margin:0 0 1.5mm;font-size:3.2mm;color:#0b3e7c}.mini.gold h4{color:#8d6b00}.mini p{margin:0;font-size:2.9mm;line-height:1.25}'+
  '.benefits{position:absolute;left:10mm;right:10mm;bottom:18mm;display:grid;grid-template-columns:repeat(4,1fr);z-index:8;text-align:center;border-top:.3mm solid #7ca8d4;padding-top:4mm}.benefit{font-size:2.9mm;font-weight:900;color:#0b3b78;border-right:.25mm solid #9ebcda}.benefit:last-child{border-right:0}.benefit strong{display:block;font-size:6mm;margin-bottom:1mm}'+
  '.footer{position:absolute;left:0;right:0;bottom:0;height:17mm;background:#fff;padding:3mm 9mm;display:grid;grid-template-columns:1.3fr .8fr 1.2fr .9fr;gap:3mm;align-items:center;color:#082d70;z-index:20;font-size:2.8mm;font-weight:900;border-top:.35mm solid #9db8d6}.footer>div:not(.brush):not(.brush2){position:relative;z-index:3;white-space:nowrap}.footer .handle{font-size:2.8mm}.footer .tag{font-size:3.8mm;font-style:italic;font-weight:1000;text-align:right}.brush{position:absolute;left:-10mm;bottom:-5mm;width:80mm;height:20mm;background:repeating-linear-gradient(-12deg,#ffd21a 0 1.2mm,transparent 1.2mm 3mm);transform:skewX(-18deg);opacity:.55;z-index:0}.brush2{position:absolute;right:-10mm;bottom:-4mm;width:55mm;height:25mm;background:repeating-linear-gradient(-48deg,#123f83 0 1mm,transparent 1mm 3mm);opacity:.45;z-index:0}'+
  '</style></head><body><div class="page"><div class="photo">'+(hero?'<img class="option2-photo" src="'+hero+'" alt="Selected '+esc(sport)+' Option 2"><img class="report-logo" src="/msa-logo-official.png" alt="MSA">':'')+'</div>'+
  '<div class="panel" style="--level:'+lv.color+';--levelsoft:'+lv.soft+'"><div class="details"><div class="col">'+
  '<div class="field"><b>PLAYER NAME:</b><span>'+esc(e.player_name)+'</span></div><div class="field"><b>SPORT:</b><span>'+esc(sport)+'</span></div><div class="field"><b>LEVEL:</b><span>'+esc(level)+'</span></div><div class="field"><b>DATE:</b><span>'+esc(date)+'</span></div><div class="field"><b>COACH:</b><span>'+esc(e.coach_name||'MSA Coach')+'</span></div>'+
  '</div></div>'+(levelImage?'<div class="levelcard"><img class="ball" src="'+levelImage+'"><div><div class="levelname">'+esc(level).toUpperCase()+'<br>LEVEL</div><div class="leveltag">'+lv.tag+'</div><div class="leveldesc">'+lv.desc+'</div></div></div>':'')+
  '<div class="section-title">SKILLS EVALUATION <span style="font-size:2.8mm;font-weight:600">(1 = Needs Improvement, 5 = Excellent)</span></div><div class="skills"><div class="thead"><div>#</div><div>SKILL</div><div>RATING (1–5)</div></div>'+rows+'<div class="overall"><span>OVERALL PERFORMANCE</span><b>'+esc(overall||'—')+'</b></div></div>'+
  '<div class="feedback-title">COACH FEEDBACK</div>'+(feedback?'<div class="feedback">'+esc(feedback)+'</div>':'')+extra+'</div>'+
  '<div class="benefits"><div class="benefit"><strong>🏆</strong>BUILD<br>SKILLS</div><div class="benefit"><strong>▮▮▮</strong>GAIN<br>CONFIDENCE</div><div class="benefit"><strong>●●●</strong>MAKE<br>FRIENDS</div><div class="benefit"><strong>★</strong>A BRIGHTER<br>TOMORROW</div></div>'+
  '<div class="footer"><div>REEF ISLAND, BAHRAIN</div><div>+973 36885993</div><div class="handle">@msaacademybahrain</div><div class="tag">PLAY · LEARN · GROW</div><div class="brush"></div><div class="brush2"></div></div></div></body></html>';

  res.setHeader('X-MSA-Report-Renderer','canonical-option2-storage-v1');
  res.setHeader('content-type','text/html; charset=utf-8');
  return res.send(html);
}