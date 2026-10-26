'use client';
// 목록: 종류 칩(찜질방·1인 목욕·안마원·피부관리), 세부 칩(목욕탕·찜질방·한증막 / 세신샵 / 안마시술소 / 왁싱 …), 가까운 순.
// 카드마다 📞 전화 · 🧭 길찾기 버튼(가격·영업 시간은 공공데이터에 없어 상세에서 네이버 지도로 안내).
import {useMemo,useState} from 'react';
import {KIND_ORDER,KINDS,km,mapUrl,n,shopPath,sinceLine,telHref,type Kind,type Slim} from '../../lib/fmt';

export function PlaceCard({p}:{p:Slim}){
  return <div className="rs-card">
    <a className="rs-card-main" href={shopPath(p.id)}>
      <span className="rs-kind" aria-hidden="true">{KINDS[p.kind].icon}</span>
      <span className="rs-card-body"><b>{p.name}</b>
        <small>{p.km!=null&&<span className="rs-km">{km(p.km)}</span>}{p.sub&&<span className="rs-tag">{p.sub}</span>}{sinceLine(p.since)}</small>
        <small className="muted">{p.addr}</small></span></a>
    <span className="rs-acts">{p.tel&&<a href={telHref(p.tel)} aria-label={`${p.name} 전화`}>📞</a>}<a href={mapUrl(p)} target="_blank" rel="noopener" aria-label={`${p.name} 길찾기`}>🧭</a></span>
  </div>;
}
export function PlaceList({items,limit=30,empty='조건에 맞는 곳이 없어요.',kind:k0}:{items:Slim[];limit?:number;empty?:string;kind?:Kind|'all'}){
  const hasKm=items.some(p=>p.km!=null);
  const kinds=KIND_ORDER.filter(k=>items.some(p=>p.kind===k));
  const [k,setK]=useState<Kind|'all'>(k0??(kinds.length===1?kinds[0]:'all'));const [sub,setSub]=useState('');const [more,setMore]=useState(limit);
  const subs=useMemo(()=>k==='all'?[]:[...new Set(items.filter(p=>p.kind===k&&p.sub).map(p=>p.sub!))],[items,k]);
  const rows=useMemo(()=>{const r=items.filter(p=>(k==='all'||p.kind===k)&&(!sub||p.sub===sub));
    return hasKm?[...r].sort((a,b)=>a.km!-b.km!):r;},[items,k,sub,hasKm]);
  const reset=()=>setMore(limit);
  return <div className="rs-list">
    {kinds.length>1&&<div className="rs-chips" role="group" aria-label="종류">
      <button type="button" className={k==='all'?'rs-chip on':'rs-chip'} onClick={()=>{setK('all');setSub('');reset();}}>전체 <small>{n(items.length)}</small></button>
      {kinds.map(x=><button type="button" key={x} className={k===x?'rs-chip on':'rs-chip'} aria-pressed={k===x} onClick={()=>{setK(x);setSub('');reset();}}>{KINDS[x].icon} {KINDS[x].label} <small>{n(items.filter(p=>p.kind===x).length)}</small></button>)}</div>}
    {subs.length>1&&<div className="rs-chips" role="group" aria-label="세부 종류">
      {subs.map(s=><button type="button" key={s} className={sub===s?'rs-chip on':'rs-chip'} onClick={()=>{setSub(sub===s?'':s);reset();}}>{s} <small>{n(items.filter(p=>p.kind===k&&p.sub===s).length)}</small></button>)}</div>}
    {!rows.length?<p className="muted">{empty}</p>
      :<div className="rs-cards">{rows.slice(0,more).map(p=><PlaceCard key={p.id} p={p}/>)}</div>}
    {rows.length>more&&<button type="button" className="rs-more" onClick={()=>setMore(x=>x+limit)}>더 보기 ({n(rows.length-more)}곳 남음)</button>}
  </div>;
}
