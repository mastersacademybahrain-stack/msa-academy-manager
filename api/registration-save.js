import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const {player_id,package_id,start_date,number_weeks,discount_percentage=0,registration_type='new',registration_id=null,tennis_categories=[],registration_date=null,paid=false}=req.body||{};
 if(!player_id||!package_id||!start_date||!(registration_date||''))return res.status(400).json({error:'Player, registration date, package and start date are required'});
 const pkg=await db.query('SELECT id,sport,sessions_per_week,duration_weeks,price,net_price,package_type,start_date,end_date FROM packages WHERE id=$1 AND active=true',[package_id]);
 if(!pkg.rows.length)return res.status(404).json({error:'Package not found'});
 const p=await db.query('SELECT id,sport,tennis_categories FROM players WHERE id=$1 AND active=true',[player_id]);
 if(!p.rows.length)return res.status(404).json({error:'Player not found'});
 const registrationSport=pkg.rows[0].sport;
 if(registration_type==='new_sport'){
  const active=await db.query("SELECT id FROM player_registrations WHERE player_id=$1 AND COALESCE(sport,'')=$2 AND start_date + (GREATEST(1,number_weeks)*7-1) >= $3 LIMIT 1",[player_id,registrationSport,start_date]);
  if(active.rows.length)return res.status(400).json({error:'This player already has an active registration for '+registrationSport+'. Use Renewal for that sport instead.'});
 }
 const cats=registrationSport==='Tennis'&&Array.isArray(tennis_categories)?[...new Set(tennis_categories.filter(x=>['Red','Orange','Green','Yellow','Veteran','Private'].includes(x)))]:[];
 const n=+pkg.rows[0].sessions_per_week,packageWeeks=+pkg.rows[0].duration_weeks,type=pkg.rows[0].package_type||'Monthly';
 let w=+(number_weeks??packageWeeks),referencePrice=Number(pkg.rows[0].price||0),netPrice=Number(pkg.rows[0].net_price||0);
 if(type==='Term'){
  if(!pkg.rows[0].end_date||start_date>pkg.rows[0].end_date)return res.status(400).json({error:'Start date cannot be after the package term end date'});
  w=Math.max(1,Math.ceil((new Date(pkg.rows[0].end_date+'T00:00:00')-new Date(start_date+'T00:00:00'))/604800000));
  referencePrice=packageWeeks?referencePrice/packageWeeks*w:0;
  netPrice=packageWeeks?netPrice/packageWeeks*w:0;
 }
 if(!n||!packageWeeks||!w)return res.status(400).json({error:'Package must have sessions per week and duration in weeks, and player number of weeks must be positive'});
 let reg;
 if(registration_id){
  const ex=await db.query('SELECT id FROM player_registrations WHERE id=$1 AND player_id=$2',[registration_id,player_id]);
  if(!ex.rows.length)return res.status(404).json({error:'Registration not found'});
  reg=registration_id;
  await db.query('UPDATE player_registrations SET package_id=$1,sport=$2,tennis_categories=$3,sessions_per_week=$4,duration_weeks=$5,start_date=$6,number_weeks=$7,reference_price=$8,net_price=$9,discount_percentage=$10,discounted_price=$11,registration_date=$12,paid=$13 WHERE id=$14',[package_id,registrationSport,cats,n,w,start_date,w,referencePrice,netPrice,Math.max(0,Math.min(100,Number(discount_percentage||0))),netPrice*(1-Math.max(0,Math.min(100,Number(discount_percentage||0)))/100),registration_date||new Date().toISOString().slice(0,10),!!paid,reg]);
 }else{
  const nr=await db.query('SELECT COALESCE(MAX(registration_no),0)+1 AS n FROM player_registrations WHERE player_id=$1',[player_id]);
  const next=+nr.rows[0].n;
  const ins=await db.query('INSERT INTO player_registrations(id,player_id,package_id,registration_no,registration_type,sport,tennis_categories,sessions_per_week,duration_weeks,start_date,number_weeks,reference_price,net_price,discount_percentage,discounted_price,registration_date,paid) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id,registration_no',[player_id,package_id,next,registration_type,registrationSport,cats,n,w,start_date,w,referencePrice,netPrice,Math.max(0,Math.min(100,Number(discount_percentage||0))),netPrice*(1-Math.max(0,Math.min(100,Number(discount_percentage||0)))/100),registration_date||new Date().toISOString().slice(0,10),!!paid]);
  reg=ins.rows[0].id;
 }
 await db.query('INSERT INTO player_packages(player_id,package_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[player_id,package_id]);
 const d=await db.query('SELECT id,registration_no,registration_type,registration_date,paid FROM player_registrations WHERE id=$1',[reg]);
 return res.json({ok:true,registration_id:reg,registration_no:d.rows[0].registration_no,registration_type:d.rows[0].registration_type,registration_date:d.rows[0].registration_date,paid:d.rows[0].paid,player_id,package_id,sessions_per_week:n,duration_weeks:w,number_weeks:w,start_date,reference_price:referencePrice,net_price:netPrice,discount_percentage:Number(discount_percentage||0),discounted_price:netPrice*(1-Number(discount_percentage||0)/100),slots_assigned:false});
}