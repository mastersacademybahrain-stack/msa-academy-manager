import { storage } from 'hatchable';
export const access='public';
export const methods=['GET'];
export default async function(req,res){
  const name=req.params?.name;
  const map={tennis:'report/tennis-option2-rendered.png',swimming:'report/swimming-option2-rendered.png'};
  const key=map[name];
  if(!key)return res.status(404).send('Not found');
  const item=await storage.get(key);
  if(!item?.buffer)return res.status(404).send('Not found');
  res.setHeader('content-type','image/png');
  res.setHeader('cache-control','public, max-age=31536000, immutable');
  return res.send(item.buffer);
}