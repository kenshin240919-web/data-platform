// Static build data: apps/civil/data/places.json (scripts/collect-civil.py, daily). Server components only.
import raw from '../data/places.json';
import {DOCS,KIND_ORDER,type Place,type Kind} from './fmt';
export * from './fmt';

type Status={updated_at:string;count:number;kinds:Record<Kind,number>;docs:number};
const D=raw as unknown as {status:Status;docs:[string,string][];items:Place[]};
export const status=D.status;
export const places=D.items;
export const docList=D.docs;
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
const kiosks=places.filter(p=>p.kind==='kiosk');
/** 자주 찾는 서류마다: 서류표 번호와 그 서류를 뗄 수 있는 발급기 수. */
export const docs=DOCS.map(d=>{const ids=new Set(docList.map(([name],i)=>d.q.test(name)?i:-1).filter(i=>i>=0));
  const names=[...new Set([...ids].map(i=>docList[i][0]))];
  return {...d,ids:[...ids],names,count:kiosks.filter(k=>k.docs?.some(i=>ids.has(i))).length};});
export const doc=(slug:string)=>docs.find(d=>d.slug===slug);
/** 무인민원발급기 서류 분류(초기 메뉴)별 서류 수 — 안내 페이지 표. */
export const menus=Object.entries(docList.reduce((a,[,m])=>(a[m||'기타']=(a[m||'기타']??0)+1,a),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]);
/** 주말·공휴일에도 쓸 수 있는 발급기 / 24시간 발급기. */
export const weekendKiosks=kiosks.filter(k=>k.hol);
export const allDayKiosks=kiosks.filter(k=>k.wk?.[0]==='00:00'&&(k.wk?.[1]==='24:00'||k.wk?.[1]==='23:59'));
