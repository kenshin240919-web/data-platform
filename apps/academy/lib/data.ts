// Static build data: apps/academy/data/summary.json (scripts/collect-academy.py, daily). Server components only.
import summary from '../data/summary.json';
import type {Card,FeeStats} from './fmt';
export * from './fmt';

export type SubjectStat={count:number;fees:FeeStats;top:Card[]};
export type Region={id:string;name:string;sido:string;zone:string;count:number;academies:number;with_fees:number;lat:number|null;lon:number|null;
  realms:Record<string,number>;grades:Record<string,number>;subjects:Record<string,SubjectStat>;top:Card[];new:Card[]};
export type Opened=Card&{region_id:string;region_name:string;established:string};
type Summary={latest?:Opened[];opened_by_month?:{month:string;count:number}[];status:{updated_at:string;count:number;with_coords:number;with_fees:number};nation:Record<string,{count:number;fees:FeeStats}>;regions:Region[]};
const S=summary as unknown as Summary;
export const status=S.status;
export const nation=S.nation;
export const regions=S.regions;
// 최근 개원(개설일 기준): 수집기가 아직 이 항목을 만들기 전 파일이면 빈 목록.
export const latest=S.latest??[];
export const openedByMonth=S.opened_by_month??[];
export const region=(id:string)=>regions.find(r=>r.id===id);
// 시도 순서는 교육청 코드 순(서울·부산·…·제주).
export const sidos=[...new Set(regions.map(r=>r.sido))].map(name=>{const rs=regions.filter(r=>r.sido===name);return {name,regions:rs,count:rs.reduce((a,r)=>a+r.count,0)};});
/** 지역×과목 페이지를 만들 최소 학원 수(내용이 너무 적은 페이지는 만들지 않음). */
export const MIN_SUBJECT=3;
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
