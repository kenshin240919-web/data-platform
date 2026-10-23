// Static build data: apps/service/data/centers.json (scripts/collect-service.py, daily). Server components only.
import raw from '../data/centers.json';
import {KIND_ORDER,type Center,type Kind} from './fmt';
export * from './fmt';

type Status={updated_at:string;count:number;kinds:Record<Kind,number>};
const D=raw as unknown as {status:Status;items:Center[]};
export const status=D.status;
export const centers=D.items;
const zero=()=>Object.fromEntries(KIND_ORDER.map(k=>[k,0])) as Record<Kind,number>;
export type Region={id:string;name:string;sido:string;zone:string;count:number;items:Center[];lat:number;lon:number;kinds:Record<Kind,number>;subs:Record<string,number>};
const by=new Map<string,Center[]>();
for(const p of centers)(by.get(p.region)??by.set(p.region,[]).get(p.region)!).push(p);
const avg=(v:number[])=>v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(5):0;
export const regions:Region[]=[...by].map(([id,items])=>{const [sido,...rest]=items[0].region_name.split(' ');const pts=items.filter(p=>p.lat!=null);
  const kinds=zero(),subs:Record<string,number>={};for(const p of items){kinds[p.kind]++;if(p.kind==='repair'&&p.sub)subs[p.sub]=(subs[p.sub]??0)+1;}
  return {id,name:items[0].region_name,sido,zone:rest.join(' ')||sido,count:items.length,items,lat:avg(pts.map(p=>p.lat!)),lon:avg(pts.map(p=>p.lon!)),kinds,subs};})
  .sort((a,b)=>a.id.slice(0,2).localeCompare(b.id.slice(0,2))||a.zone.localeCompare(b.zone,'ko'));
export const region=(id:string)=>regions.find(r=>r.id===id);
export const sidos=[...new Set(regions.map(r=>r.sido))].map(name=>{const rs=regions.filter(r=>r.sido===name);return {name,regions:rs,count:rs.reduce((a,r)=>a+r.count,0)};});
export const nation={kinds:centers.reduce((a,p)=>(a[p.kind]++,a),zero()),subs:centers.filter(p=>p.kind==='repair').reduce((a,p)=>(p.sub&&(a[p.sub]=(a[p.sub]??0)+1),a),{} as Record<string,number>)};
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
export const ofKind=(items:Center[],k:Kind)=>items.filter(p=>p.kind===k);
