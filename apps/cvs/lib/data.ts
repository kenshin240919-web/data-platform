// Static build data: apps/cvs/data/stores.json (scripts/collect-cvs.py, daily). Server components only.
import raw from '../data/stores.json';
import {BRAND_ORDER,type BrandKey,type Store} from './fmt';
export * from './fmt';

type Status={updated_at:string;count:number;brands:Record<BrandKey,number>;with_tel:number;no_ph:number};
type RStat={brands:Partial<Record<BrandKey,number>>;no_ph:number;ph_mid:number|null};
const D=raw as unknown as {status:Status;stats:Record<string,RStat>;items:Store[]};
export const status=D.status;
export const stores=D.items;
const zero=()=>Object.fromEntries(BRAND_ORDER.map(k=>[k,0])) as Record<BrandKey,number>;
export type Region={id:string;name:string;sido:string;zone:string;count:number;items:Store[];lat:number;lon:number;brands:Record<BrandKey,number>;no_ph:number;ph_mid:number|null};
const by=new Map<string,Store[]>();
for(const p of stores)(by.get(p.region)??by.set(p.region,[]).get(p.region)!).push(p);
const avg=(v:number[])=>v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(5):0;
export const regions:Region[]=[...by].map(([id,items])=>{const [sido,...rest]=items[0].region_name.split(' ');const pts=items.filter(p=>p.lat!=null);
  const brands=zero();for(const p of items)brands[p.brand]++;const st=D.stats[id];
  return {id,name:items[0].region_name,sido,zone:rest.join(' ')||sido,count:items.length,items,lat:avg(pts.map(p=>p.lat!)),lon:avg(pts.map(p=>p.lon!)),brands,no_ph:st?.no_ph??0,ph_mid:st?.ph_mid??null};})
  .sort((a,b)=>a.id.slice(0,2).localeCompare(b.id.slice(0,2))||a.zone.localeCompare(b.zone,'ko'));
export const region=(id:string)=>regions.find(r=>r.id===id);
export const sidos=[...new Set(regions.map(r=>r.sido))].map(name=>{const rs=regions.filter(r=>r.sido===name);return {name,regions:rs,count:rs.reduce((a,r)=>a+r.count,0)};});
export const nation={brands:stores.reduce((a,p)=>(a[p.brand]++,a),zero())};
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
/** 정렬: 브랜드 화면 순서, 같은 브랜드는 이름순. */
export const ordered=(items:Store[])=>[...items].sort((a,b)=>BRAND_ORDER.indexOf(a.brand)-BRAND_ORDER.indexOf(b.brand)||a.name.localeCompare(b.name,'ko'));
