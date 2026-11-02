// Static build data: apps/job/data/places.json (scripts/collect-job.py, daily). Server components only.
import raw from '../data/places.json';
import {distKm,KIND_ORDER,type Place,type Kind} from './fmt';
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
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
export const ordered=(items:Place[])=>[...items].sort((a,b)=>KIND_ORDER.indexOf(a.kind)-KIND_ORDER.indexOf(b.kind)||a.name.localeCompare(b.name,'ko'));
export const centers=places.filter(p=>p.kind==='center');
/** 이 시군구를 관할하는 고용센터(관할구역 원문으로 맞춘 것). 못 맞췄으면 가장 가까운 센터를 '가까운 곳'으로. */
export function centerFor(r:Region){
  const own=centers.filter(c=>c.juris?.includes(r.id));
  if(own.length)return {list:own,exact:true};
  const near=[...centers].filter(c=>c.lat!=null).sort((a,b)=>distKm(r.lat,r.lon,a.lat!,a.lon!)-distKm(r.lat,r.lon,b.lat!,b.lon!)).slice(0,1);
  return {list:near,exact:false};
}
export const regionName=(id:string)=>region(id)?.name??id;
