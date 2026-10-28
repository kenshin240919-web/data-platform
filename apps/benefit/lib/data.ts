// Static build data: apps/benefit/data/benefits.json (scripts/collect-benefit.py — 배포 때마다 새로 받음, 저장소에 없음).
// Server components only. 파일이 커서(수십 MB) import 대신 빌드 때 한 번 읽는다.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import regionsRaw from '../../weather/data/regions.json';
import {FIELD_ORDER,kstToday,userFlags,type Data,type Field,type Item,type Row} from './fmt';
export * from './fmt';

const file=path.join(process.cwd(),'data/benefits.json');
const D:Data=(()=>{try{return JSON.parse(readFileSync(file,'utf-8'));}catch{return {status:{updated_at:new Date().toISOString(),count:0,scope:{}},items:[]};}})();
export const status=D.status;
export const items=D.items;
const byId=new Map(items.map(i=>[i.id,i]));
export const item=(id:string)=>byId.get(id);
export const today=kstToday(Date.parse(status.updated_at)||Date.now());

type WR={code:string;sidoShort:string;sidoName:string;name:string;lat:number;lon:number};
/** 시군구(일반구는 시 코드로 묶음 — 다른 내근처 사이트와 같은 규칙). name은 '서울 강남구'처럼 시도를 붙인 표시 이름. */
export type Region={code:string;sido:string;zone:string;name:string;lat:number;lon:number};
export const regions:Region[]=(()=>{const m=new Map<string,{r:Region;pts:[number,number][]}>();
  for(const r of regionsRaw as WR[]){const city=r.name.includes(' ')?r.name.split(' ')[0]:r.name;const code=r.name.includes(' ')?r.code.slice(0,4)+'0':r.code;
    const name=r.sidoShort==='세종'?'세종시':`${r.sidoShort} ${city}`;
    const e=m.get(code)??m.set(code,{r:{code,sido:r.sidoShort,zone:city,name,lat:0,lon:0},pts:[]}).get(code)!;e.pts.push([r.lat,r.lon]);}
  return [...m.values()].map(({r,pts})=>({...r,lat:+(pts.reduce((a,p)=>a+p[0],0)/pts.length).toFixed(5),lon:+(pts.reduce((a,p)=>a+p[1],0)/pts.length).toFixed(5)}));})();
export const region=(code:string)=>regions.find(r=>r.code===code);
export const SIDO_ORDER=['서울','부산','대구','인천','대전','울산','세종','경기','강원','충북','충남','전북','전남광주','경북','경남','제주'];
export const sidoList=SIDO_ORDER.filter(s=>regions.some(r=>r.sido===s));

/** 많이 찾는 순(원본 조회수) */
export const byViews=(a:Item,b:Item)=>(b.views??0)-(a.views??0);
export const nationItems=items.filter(i=>i.scope==='nation');
const sidoMap=new Map<string,Item[]>(),localMap=new Map<string,Item[]>();
for(const i of items){if(i.scope==='sido'&&i.sido)(sidoMap.get(i.sido)??sidoMap.set(i.sido,[]).get(i.sido)!).push(i);
  if(i.scope==='local'&&i.region)(localMap.get(i.region)??localMap.set(i.region,[]).get(i.region)!).push(i);}
export const sidoItems=(s:string)=>sidoMap.get(s)??[];
export const localItems=(code:string)=>localMap.get(code)??[];
/** 그 시군구 사람이 받을 수 있는 것: 시군구 + 시도 + 전국 */
export const allFor=(r:Region)=>[...localItems(r.code),...sidoItems(r.sido),...nationItems];
export const open=(i:Item)=>!i.due||i.due>=today;
/** 마감이 다가오는 것(오늘~days일 뒤) */
export const dueSoon=(list:Item[],days=31)=>{const end=kstToday(Date.parse(today)+days*864e5-9*3600e3);return list.filter(i=>i.due&&i.due>=today&&i.due<=end).sort((a,b)=>a.due!.localeCompare(b.due!)||byViews(a,b));};
export const fieldCount=(list:Item[])=>Object.fromEntries(FIELD_ORDER.map(f=>[f,list.filter(i=>i.field===f).length])) as Record<Field,number>;
/** 새로 생긴 것(등록일) — 최근 순 */
export const newest=(list:Item[],k=30)=>[...list].filter(i=>i.reg).sort((a,b)=>b.reg!.localeCompare(a.reg!)||byViews(a,b)).slice(0,k);
export const changed=(list:Item[],k=30)=>[...list].filter(i=>i.mod).sort((a,b)=>b.mod!.localeCompare(a.mod!)||byViews(a,b)).slice(0,k);
/** 같은 열쇠(비슷한 혜택)를 가진 다른 지역 것들 */
const keyMap=new Map<string,Item[]>();
for(const i of items)if(i.key)(keyMap.get(i.key)??keyMap.set(i.key,[]).get(i.key)!).push(i);
export const similar=(i:Item)=>i.key?(keyMap.get(i.key)??[]).filter(x=>x.id!==i.id):[];
export const regionFieldMin=10;  // 지역×분야 페이지는 이만큼 있을 때만
export const regionFields=(r:Region)=>{const l=[...localItems(r.code),...sidoItems(r.sido)];return FIELD_ORDER.filter(f=>l.filter(i=>i.field===f).length>=regionFieldMin);};
/** 브라우저용 가벼운 줄 */
export const row=(i:Item):Row=>[i.id,i.name,i.scope==='local'?i.region??'':i.scope==='sido'?i.sido??'':'',i.field,i.amount??0,i.due??'',i.age?.[0]??-1,i.age?.[1]??-1,i.mask,userFlags(i.user)||1,i.views??0];
/** 사이트맵 단계(학원·병원과 같은 방식): 1 많이 찾는 3,000건·마감 있는 것·개인 현금 → 2 개인·가구 대상 → 3 전체 */
export const SITEMAP_STAGE=1;
const top=new Set([...items].sort(byViews).slice(0,3000).map(i=>i.id));
export const stageOf=(i:Item)=>top.has(i.id)||(i.due&&i.due>=today)||((i.user??[]).includes('개인')&&(i.kind??[]).some(k=>k.startsWith('현금')))?1:(i.user??[]).some(u=>u==='개인'||u==='가구')?2:3;
