import { db } from 'hatchable';
import { requireManager } from '../lib/access.js';
export const access='member'; export const methods=['POST'];
export default async function(req,res){
 if(!(await requireManager(req,res)))return;
 const {player_id,package_id,start_date,number_weeks,discount_percentage=0,registration_type='new',registration_id=null}=req.body||{};
 if(!player_id||!package_id||!start_date)return res.status(400).json({error:'Player, package and starting date are required'});
 const pkg=await db.query('SELECT id,sport,sessions_per_week,duration_weeks,price,net_price,package_type,start_date,end_date FROM packages WHERE id=$1 AND active=true',[package_id]);
 if(!pkg.rows.length)return res.status(404).json({error:'Package not found'});
 const p=await db.query('SELECT id,sport,tennis_categories FROM players WHERE id=$1 AND active=true',[player_id]);
 if(!p.rows.length)return res.status(404).json({error:'Player not found'});
 const n=+pkg.rows[0].sessions_per_week,packageWeeks=+pkg.rows[0].duration_weeks,type=pkg.rows[0].package_type||'Monthly';
 let w=+(number_weeks??packageWeeks),referencePrice=Number(pkg.rows[0].price||0),netPrice=Number(pkg.rows[0].net_price||0);
 if(type==='Term'){
  if(!pkg.rows[0].end_date||start_date>pkg.rows[0].end_date)return res.status(400).json({error:'Start date must be on or before the package term end date'});
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
  await db.query('UPDATE player_registrations SET package_id=$1 WHERE id=$2',[package_id,reg]);
 }else{
  const nr=await db.query('SELECT COALESCE(MAX(registration_no),0)+1 AS n FROM player_registrations WHERE player_id=$1',[player_id]);
  const next=+nr.rows[0].n;
  const ins=await db.query('INSERT INTO player_registrations(id,player_id,package_id,registration_no,registration_type,sessions_per_week,duration_weeks,start_date,number_weeks,reference_price,net_price,discount_percentage,discounted_price) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id,registration_no',[player_id,package_id,next,registration_type,n,w,start_date,w,referencePrice,netPrice,Math.max(0,Math.min(100,Number(discount_percentage||0))),netPrice*(1-Math.max(0,Math.min(100,Number(discount_percentage||0)))/100)]);
  reg=ins.rows[0].id;
 }
 await db.query('INSERT INTO player_packages(player_id,package_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[player_id,package_id]);
 const d=await db.query('SELECT id,registration_no,registration_type FROM player_registrations WHERE id=$1',[reg]);
 return res.json({ok:true,registration_id:reg,registration_no:d.rows[0].registration_no,registration_type:d.rows[0].registration_type,player_id,package_id,sessions_per_week:n,duration_weeks:w,number_weeks:w,start_date,reference_price:referencePrice,net_price:netPrice,discount_percentage:Number(discount_percentage||0),discounted_price:netPrice*(1-Number(discount_percentage||0)/100),slots_assigned:false});
}