// Static build data: apps/school/data/schools.json (scripts/collect-school.py, daily). Server components only.
import data from '../data/schools.json';
import {KIND_ORDER,type School} from './fmt';
export * from './fmt';

const D=data as unknown as {status:{updated_at:string;count:number;with_coords:number};items:School[]};
export const status=D.status;
export const schools=D.items;
export type Region={id:string;name:string;sido:string;zone:string;count:number;kinds:Record<string,number>;schools:School[];lat:number|null;lon:number|null};
const byRegion=new Map<string,School[]>();
for(const s of schools)(byRegion.get(s.region)??byRegion.set(s.region,[]).get(s.region)!).push(s);
const avg=(v:number[])=>v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(5):null;
export const regions:Region[]=[...byRegion].map(([id,list])=>{const [sido,...rest]=list[0].region_name.split(' ');const pts=list.filter(s=>s.lat!=null);
  return {id,name:list[0].region_name,sido,zone:rest.join(' ')||sido,count:list.length,kinds:Object.fromEntries(KIND_ORDER.map(k=>[k,list.filter(s=>s.k===k).length]).filter(([,c])=>c)),
    schools:list,lat:avg(pts.map(s=>s.lat!)),lon:avg(pts.map(s=>s.lon!))};})
  // 시도는 행정 코드 순(서울 11·부산 26·…), 시도 안은 가나다순.
  .sort((a,b)=>a.id.slice(0,2).localeCompare(b.id.slice(0,2))||a.zone.localeCompare(b.zone,'ko'));
export const region=(id:string)=>regions.find(r=>r.id===id);
export const sidos=[...new Set(regions.map(r=>r.sido))].map(name=>{const rs=regions.filter(r=>r.sido===name);return {name,regions:rs,count:rs.reduce((a,r)=>a+r.count,0)};});
export const kindCount=Object.fromEntries(KIND_ORDER.map(k=>[k,schools.filter(s=>s.k===k).length]));
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
