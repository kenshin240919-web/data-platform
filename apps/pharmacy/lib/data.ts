// Static build data: apps/pharmacy/data/pharmacies.json (scripts/collect-pharmacy.py, daily). Server components only.
import raw from '../data/pharmacies.json';
import {CONDITIONS,type Cond,type Pharmacy} from './fmt';
export * from './fmt';

const D=raw as unknown as {status:{updated_at:string;count:number};items:Pharmacy[]};
export const status=D.status;
export const pharmacies=D.items;
export type Region={id:string;name:string;sido:string;zone:string;count:number;items:Pharmacy[];lat:number;lon:number;cond:Record<Cond,number>};
const by=new Map<string,Pharmacy[]>();
for(const p of pharmacies)(by.get(p.region)??by.set(p.region,[]).get(p.region)!).push(p);
const avg=(v:number[])=>+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(5);
export const regions:Region[]=[...by].map(([id,items])=>{const [sido,...rest]=items[0].region_name.split(' ');const pts=items.filter(p=>p.lat!=null);
  return {id,name:items[0].region_name,sido,zone:rest.join(' ')||sido,count:items.length,items,lat:avg(pts.map(p=>p.lat!)),lon:avg(pts.map(p=>p.lon!)),
    cond:Object.fromEntries(Object.entries(CONDITIONS).map(([k,c])=>[k,items.filter(c.test).length])) as Record<Cond,number>};})
  // 시도는 행정 코드 순(서울 11·부산 26·…), 시도 안은 가나다순.
  .sort((a,b)=>a.id.slice(0,2).localeCompare(b.id.slice(0,2))||a.zone.localeCompare(b.zone,'ko'));
export const region=(id:string)=>regions.find(r=>r.id===id);
export const sidos=[...new Set(regions.map(r=>r.sido))].map(name=>{const rs=regions.filter(r=>r.sido===name);return {name,regions:rs,count:rs.reduce((a,r)=>a+r.count,0)};});
export const nation=Object.fromEntries(Object.entries(CONDITIONS).map(([k,c])=>[k,pharmacies.filter(c.test).length])) as Record<Cond,number>;
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
/** 브라우저로 보내는 가벼운 카드(목록 상태 계산용). */
export const slim=(p:Pharmacy)=>({id:p.id,name:p.name,address:p.address,tel:p.tel,hours:p.hours,lat:p.lat,lon:p.lon});
