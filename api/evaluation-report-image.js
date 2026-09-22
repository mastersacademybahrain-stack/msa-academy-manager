import { storage } from 'hatchable';

export const access='public';
export const methods=['GET'];

const assets={
  tennis:{key:'evaluation-report/selected/tennis-option2.webp',type:'image/webp'},
  swimming:{key:'evaluation-report/selected/swimming-option2.jpg',type:'image/jpeg'}
};

export default async function(req,res){
  const sport=String(req.query?.sport||'').toLowerCase();
  const asset=assets[sport];
  if(!asset)return res.status(404).send('Not found');
  const item=await storage.get(asset.key);
  if(!item?.buffer)return res.status(404).send('Selected report image not found');
  res.setHeader('content-type',asset.type);
  res.setHeader('cache-control','no-store, max-age=0');
  res.setHeader('content-length',String(item.buffer.length));
  res.setHeader('x-msa-report-asset','selected-option2-only');
  return res.send(item.buffer);
}