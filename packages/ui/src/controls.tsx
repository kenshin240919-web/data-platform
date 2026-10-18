'use client';
import {useState} from 'react';

const SIDO_SHORT:Record<string,string>={서울특별시:'서울',부산광역시:'부산',대구광역시:'대구',인천광역시:'인천',광주광역시:'광주',대전광역시:'대전',울산광역시:'울산',세종특별자치시:'세종',경기도:'경기',강원특별자치도:'강원',충청북도:'충북',충청남도:'충남',전북특별자치도:'전북',전라남도:'전남',경상북도:'경북',경상남도:'경남',제주특별자치도:'제주',전남광주통합특별시:'전남광주'};
/**
 * 지역 고르기: 시도 버튼 한 줄 → 누르면 그 시도 시군구만(정보 많은 순). 처음에는 인기 지역 TOP 8.
 * 모든 지역 링크는 HTML에 들어가 있어(숨김 그룹 포함) 검색엔진이 따라갈 수 있다.
 */
export function RegionPicker({items,base}:{items:{id:string;name:string;count:number}[];base:string}){
  const groups=new Map<string,typeof items>();
  for(const r of items){const s=r.name.split(' ')[0];groups.set(s,[...(groups.get(s)??[]),r]);}
  const sidos=[...groups.entries()].map(([name,list])=>({name,short:SIDO_SHORT[name]??name,list:[...list].sort((a,b)=>b.count-a.count),total:list.reduce((n,r)=>n+r.count,0)}));
  const top=[...items].sort((a,b)=>b.count-a.count).slice(0,8);
  const [sel,setSel]=useState<string|null>(null);
  const label=(r:{name:string})=>{const [s,...rest]=r.name.split(' ');return `${SIDO_SHORT[s]??s} ${rest.join(' ')}`.trim();};
  return <div className="region-picker">
    <div className="region-tabs" role="tablist">{sidos.map(s=><button key={s.name} type="button" role="tab" aria-selected={sel===s.name} className={sel===s.name?'on':''} onClick={()=>setSel(sel===s.name?null:s.name)}>{s.short}<small>{Number(s.total).toLocaleString()}</small></button>)}</div>
    <div className="region-chips" hidden={sel!==null}><span className="region-chips-label">인기 지역</span>{top.map(r=><a key={r.id} href={`${base}/region/${r.id}`}>{label(r)}<small>{Number(r.count).toLocaleString()}</small></a>)}</div>
    {sidos.map(s=><div key={s.name} className="region-chips" hidden={sel!==s.name}><span className="region-chips-label">{s.name}</span>{s.list.map(r=><a key={r.id} href={`${base}/region/${r.id}`}>{r.name.split(' ').slice(1).join(' ')||r.name}<small>{Number(r.count).toLocaleString()}</small></a>)}</div>)}
  </div>;
}
