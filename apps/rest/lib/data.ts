// Static build data: apps/rest/data/places.json (scripts/collect-rest.py, daily). Server components only.
import raw from '../data/places.json';
import {KIND_ORDER,type Place,type Kind} from './fmt';
export * from './fmt';

type Status={updated_at:string;count:number;kinds:Record<Kind,number>};
const D=raw as unknown as {status:Status;items:Place[]};
export const status=D.status;
export const places=D.items;
const zero=()=>Object.fromEntries(KIND_ORDER.map(k=>[k,0])) as Record<Kind,number>;
export type Region={id:string;name:string;sido:string;zone:string;count:number;items:Place[];lat:number;lon:number;kinds:Record<Kind,number>};
const by=new Map<string,Place[]>();
for(const p of places)(by.get(p.region)??by.set(p.region,[]).get(p.region)!).push(p);
const avg=(v:number[])=>v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(5):0;
export const regions:Region[]=[...by].map(([id,items])=>{const [sido,...rest]=items[0].region_name.split(' ');const pts=items.filter(p=>p.lat!=null);
  const kinds=zero();for(const p of items)kinds[p.kind]++;
  return {id,name:items[0].region_name,sido,zone:rest.join(' ')||sido,count:items.length,items,lat:avg(pts.map(p=>p.lat!)),lon:avg(pts.map(p=>p.lon!)),kinds};})
  .sort((a,b)=>a.id.slice(0,2).localeCompare(b.id.slice(0,2))||a.zone.localeCompare(b.zone,'ko'));
export const region=(id:string)=>regions.find(r=>r.id===id);
export const sidos=[...new Set(regions.map(r=>r.sido))].map(name=>{const rs=regions.filter(r=>r.sido===name);return {name,regions:rs,count:rs.reduce((a,r)=>a+r.count,0)};});
export const nation={kinds:places.reduce((a,p)=>(a[p.kind]++,a),zero())};
export const subsOf=(items:Place[])=>Object.entries(items.reduce((a,p)=>(p.sub&&(a[p.sub]=(a[p.sub]??0)+1),a),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]);
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
/** 정렬: 찜질방·사우나 → 1인·프라이빗 → 안마원 → 피부관리 화면 순서 그대로, 같은 종류는 오래 영업한 순(인허가일). */
export const ordered=(items:Place[])=>[...items].sort((a,b)=>KIND_ORDER.indexOf(a.kind)-KIND_ORDER.indexOf(b.kind)||(a.since??'9').localeCompare(b.since??'9'));
