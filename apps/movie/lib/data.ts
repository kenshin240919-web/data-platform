// Static build data: apps/movie/data/theaters.json (scripts/collect-movie.py, daily). Server components only.
import raw from '../data/theaters.json';
import {CHAIN_ORDER,type ChainKey,type Theater} from './fmt';
export * from './fmt';

type Status={updated_at:string;count:number;chains:Record<ChainKey,number>;screens:number;with_tel:number;drive:number};
type RStat={chains:Partial<Record<ChainKey,number>>;screens:number};
const D=raw as unknown as {status:Status;stats:Record<string,RStat>;items:Theater[]};
export const status=D.status;
export const theaters=D.items;
const zero=()=>Object.fromEntries(CHAIN_ORDER.map(k=>[k,0])) as Record<ChainKey,number>;
export type Region={id:string;name:string;sido:string;zone:string;count:number;screens:number;items:Theater[];lat:number;lon:number;chains:Record<ChainKey,number>};
const by=new Map<string,Theater[]>();
for(const p of theaters)(by.get(p.region)??by.set(p.region,[]).get(p.region)!).push(p);
const avg=(v:number[])=>v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(5):0;
export const regions:Region[]=[...by].map(([id,items])=>{const [sido,...rest]=items[0].region_name.split(' ');const pts=items.filter(p=>p.lat!=null);
  const chains=zero();for(const p of items)chains[p.chain]++;
  return {id,name:items[0].region_name,sido,zone:rest.join(' ')||sido,count:items.length,screens:items.reduce((a,p)=>a+p.screens,0),items,lat:avg(pts.map(p=>p.lat!)),lon:avg(pts.map(p=>p.lon!)),chains};})
  .sort((a,b)=>a.id.slice(0,2).localeCompare(b.id.slice(0,2))||a.zone.localeCompare(b.zone,'ko'));
export const region=(id:string)=>regions.find(r=>r.id===id);
export const theater=(id:string)=>theaters.find(t=>t.id===id);
export const sidos=[...new Set(regions.map(r=>r.sido))].map(name=>{const rs=regions.filter(r=>r.sido===name);return {name,regions:rs,count:rs.reduce((a,r)=>a+r.count,0)};});
export const nation={chains:theaters.reduce((a,p)=>(a[p.chain]++,a),zero())};
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
/** 정렬: 체인 화면 순서, 같은 체인은 이름순. */
export const ordered=(items:Theater[])=>[...items].sort((a,b)=>CHAIN_ORDER.indexOf(a.chain)-CHAIN_ORDER.indexOf(b.chain)||a.name.localeCompare(b.name,'ko'));
export const specials=()=>{const c=new Map<string,number>();for(const t of theaters)for(const s of t.special??[])c.set(s,(c.get(s)??0)+1);return [...c].sort((a,b)=>b[1]-a[1]);};
