// Static build data: apps/parking/data/parkings.json (scripts/collect-parking.py, daily). Server components only.
import raw from '../data/parkings.json';
import {CONDITIONS,feeFor,type Cond,type Lot} from './fmt';
export * from './fmt';

type Status={updated_at:string;count:number;free:number;with_coords:number;ref_min:string|null;ref_max:string|null};
const D=raw as unknown as {status:Status;items:Lot[]};
export const status=D.status;
export const lots=D.items;
const median=(v:number[])=>{if(!v.length)return null;const s=[...v].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};
/** 유료 주차장의 1시간 요금 중앙값(계산할 수 있는 곳만) */
export const hourMedian=(items:Lot[])=>median(items.filter(p=>p.charge!=='무료').map(p=>feeFor(p,60)).filter((v):v is number=>v!=null&&v>0));
export type Region={id:string;name:string;sido:string;zone:string;count:number;items:Lot[];lat:number;lon:number;cond:Record<Cond,number>;spaces:number;hour:number|null};
const by=new Map<string,Lot[]>();
for(const p of lots)(by.get(p.region)??by.set(p.region,[]).get(p.region)!).push(p);
const avg=(v:number[])=>v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(5):0;
export const regions:Region[]=[...by].map(([id,items])=>{const [sido,...rest]=items[0].region_name.split(' ');const pts=items.filter(p=>p.lat!=null);
  return {id,name:items[0].region_name,sido,zone:rest.join(' ')||sido,count:items.length,items,lat:avg(pts.map(p=>p.lat!)),lon:avg(pts.map(p=>p.lon!)),
    cond:Object.fromEntries(Object.entries(CONDITIONS).map(([k,c])=>[k,items.filter(c.test).length])) as Record<Cond,number>,
    spaces:items.reduce((a,p)=>a+(p.spaces??0),0),hour:hourMedian(items)};})
  // 시도는 행정 코드 순(서울 11·부산 26·…), 시도 안은 가나다순.
  .sort((a,b)=>a.id.slice(0,2).localeCompare(b.id.slice(0,2))||a.zone.localeCompare(b.zone,'ko'));
export const region=(id:string)=>regions.find(r=>r.id===id);
export const sidos=[...new Set(regions.map(r=>r.sido))].map(name=>{const rs=regions.filter(r=>r.sido===name);return {name,regions:rs,count:rs.reduce((a,r)=>a+r.count,0)};});
export const nation={...Object.fromEntries(Object.entries(CONDITIONS).map(([k,c])=>[k,lots.filter(c.test).length])) as Record<Cond,number>,
  spaces:lots.reduce((a,p)=>a+(p.spaces??0),0),hour:hourMedian(lots),paid:lots.filter(p=>p.charge!=='무료').length};
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
/** '2026년 4월' (지자체 기준일 중 가장 많은 달) */
export const refMonth=(items:Lot[]=lots)=>{const c=new Map<string,number>();for(const p of items)if(p.ref)c.set(p.ref.slice(0,7),(c.get(p.ref.slice(0,7))??0)+1);
  const top=[...c].sort((a,b)=>b[1]-a[1])[0]?.[0];return top?`${+top.slice(0,4)}년 ${+top.slice(5,7)}월`:'';};
