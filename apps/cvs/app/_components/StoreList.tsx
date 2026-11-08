'use client';
// 목록: 브랜드 칩(CU·GS25·세븐일레븐…), 가까운 순. 카드마다 📞 전화. 길찾기는 상세에서만(한 번 더 눌러 매장을 확인하게 — 클릭·체류).
import {useMemo,useState} from 'react';
import {BRAND_ORDER,BRANDS,km,meters,n,storePath,telHref,type BrandKey,type Slim} from '../../lib/fmt';

export function StoreCard({p}:{p:Slim}){
  return <div className="cv-card">
    <a className="cv-card-main" data-gj-pt={p.lat!=null&&p.lon!=null?`${p.lat},${p.lon}`:undefined} data-gj-name={p.name} href={storePath(p.id)}>
      <span className="cv-icon" aria-hidden="true">🏪</span>
      <span className="cv-card-body"><b>{p.name}</b>
        <small>{p.km!=null&&<span className="cv-km">{km(p.km)}</span>}<span className="cv-tag">{BRANDS[p.brand].label}</span>{p.ph?`약국 ${meters(p.ph.m)}`:'3km 안 약국 없음'}</small>
        <small className="muted">{p.addr}</small></span></a>
    {p.tel&&<span className="cv-acts"><a href={telHref(p.tel)} aria-label={`${p.name} 전화`}>📞</a></span>}
  </div>;
}
export function StoreList({items,limit=30,empty='조건에 맞는 곳이 없어요.',brand:b0}:{items:Slim[];limit?:number;empty?:string;brand?:BrandKey}){
  const hasKm=items.some(p=>p.km!=null);
  const brands=BRAND_ORDER.filter(k=>items.some(p=>p.brand===k));
  const [b,setB]=useState<BrandKey|'all'>(b0??'all');const [more,setMore]=useState(limit);
  const rows=useMemo(()=>{const r=items.filter(p=>b==='all'||p.brand===b);return hasKm?[...r].sort((x,y)=>x.km!-y.km!):r;},[items,b,hasKm]);
  return <div className="cv-list">
    {brands.length>1&&!b0&&<div className="cv-chips" role="group" aria-label="브랜드">
      <button type="button" className={b==='all'?'cv-chip on':'cv-chip'} onClick={()=>{setB('all');setMore(limit);}}>전체 <small>{n(items.length)}</small></button>
      {brands.map(x=><button type="button" key={x} className={b===x?'cv-chip on':'cv-chip'} aria-pressed={b===x} onClick={()=>{setB(x);setMore(limit);}}>{BRANDS[x].label} <small>{n(items.filter(p=>p.brand===x).length)}</small></button>)}</div>}
    {!rows.length?<p className="muted">{empty}</p>:<div className="cv-cards">{rows.slice(0,more).map(p=><StoreCard key={p.id} p={p}/>)}</div>}
    {rows.length>more&&<button type="button" className="cv-more" onClick={()=>setMore(x=>x+limit)}>더 보기 ({n(rows.length-more)}곳 남음)</button>}
  </div>;
}
