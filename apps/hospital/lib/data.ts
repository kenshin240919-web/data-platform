// Static build data: apps/hospital/data/summary.json (scripts/collect-hospital.py, daily). Server components only.
import raw from '../data/summary.json';
import type {Card} from './fmt';
export * from './fmt';

type DeptStat={count:number;night:number;sun:number;hol:number;top:Card[]};
export type Region={id:string;name:string;sido:string|null;count:number;lat:number|null;lon:number|null;divs:Record<string,number>;er:Card[];
  cond:{night:number;sat:number;sun:number;hol:number};cond_top:{night:Card[];sun:Card[];hol:Card[]};depts:Record<string,DeptStat>;top:Card[]};
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
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
