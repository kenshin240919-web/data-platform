// Static build data: apps/hospital/data/summary.json (scripts/collect-hospital.py, daily). Server components only.
import raw from '../data/summary.json';
import {DEPTS,hm,type Card} from './fmt';
export * from './fmt';

export type Late={id:string;name:string;close:number}|null;
type DeptStat={count:number;night:number;sun:number;hol:number;late?:Late;top:Card[]};
export type Region={id:string;name:string;sido:string|null;count:number;lat:number|null;lon:number|null;divs:Record<string,number>;er:Card[];
  cond:{night:number;sat:number;sun:number;hol:number};cond_top:{night:Card[];sun:Card[];hol:Card[]};depts:Record<string,DeptStat>;late?:Late;top:Card[]};
type Summary={status:{updated_at:string;count:number};depts:Record<string,string>;nation:Record<string,number>;cond:{night:number;sat:number;sun:number;hol:number};er:number;divs:Record<string,number>;regions:Region[]};
const S=raw as unknown as Summary;
export const status=S.status,nation=S.nation,cond=S.cond,erCount=S.er,divs=S.divs;
// 시도는 행정 코드 순, 시도 안은 가나다순.
export const regions=[...S.regions].sort((a,b)=>a.id.slice(0,2).localeCompare(b.id.slice(0,2))||a.name.localeCompare(b.name,'ko'));
export const region=(id:string)=>regions.find(r=>r.id===id);
export const sidoOf=(r:Region)=>r.name.split(' ')[0];
export const zoneOf=(r:Region)=>r.name.split(' ').slice(1).join(' ')||r.name;
export const sidos=[...new Set(regions.map(sidoOf))].map(name=>{const rs=regions.filter(r=>sidoOf(r)===name);return {name,regions:rs,count:rs.reduce((a,r)=>a+r.count,0)};});
/** 지역×과목 페이지를 만들 최소 기관 수(내용이 너무 적은 페이지는 만들지 않음). */
export const MIN_DEPT=3;
/** 네이버에서 실제로 많이 찾는 이름(11/14 검색광고 키워드 도구: '소아과'가 '소아청소년과'보다 훨씬 많음). */
export const SEARCH_NAME:Record<string,string>={pediatrics:'소아과',uro:'비뇨기과',psych:'정신과'};
export const deptSearch=(k:string)=>SEARCH_NAME[k]??DEPTS[k]??k;
/** 마감 시각(1930·2530) → '19:30'·'새벽 01:30'. */
export const closeHm=(c:number)=>hm(String(c).padStart(4,'0'));
/** 과목별 수를 많은 순으로 '내과 12·소아과 3'(0곳 빼고, 최대 n개 — 소아과는 순위 밖이어도 넣음: 가장 많이 찾는 과목). */
export const deptCounts=(r:Region,k:'night'|'sun'|'hol',n=5)=>Object.entries(r.depts).filter(([,d])=>d[k]>0).sort((a,b)=>b[1][k]-a[1][k]).filter(([d],i)=>i<n||d==='pediatrics').slice(0,n+1).map(([d,v])=>`${deptSearch(d)} ${v[k].toLocaleString('ko-KR')}`).join('·');
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
