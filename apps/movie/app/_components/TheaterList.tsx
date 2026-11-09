'use client';
// 목록: 체인 칩(CGV·롯데시네마·메가박스…), 가까운 순. 카드는 극장 페이지로(길찾기는 극장 페이지에서만 — 클릭·체류).
import {useMemo,useState} from 'react';
import {CHAIN_ORDER,CHAINS,km,n,theaterPath,telHref,type ChainKey,type Slim} from '../../lib/fmt';

export function TheaterCard({p}:{p:Slim}){
  return <div className="mv-card">
    <a className="mv-card-main" data-gj-pt={p.lat!=null&&p.lon!=null?`${p.lat},${p.lon}`:undefined} data-gj-name={p.name} href={theaterPath(p.id)}>
      <span className="mv-icon" aria-hidden="true">{p.drive?'🚗':'🎬'}</span>
      <span className="mv-card-body"><b>{p.name}</b>
        <small>{p.km!=null&&<span className="mv-km">{km(p.km)}</span>}<span className="mv-tag">{CHAINS[p.chain].label}</span>상영관 {p.screens}개{p.special.length>0&&` · ${p.special.slice(0,3).join('·')}`}</small>
        <small className="muted">{p.addr}</small></span></a>
    {p.tel&&<span className="mv-acts"><a href={telHref(p.tel)} aria-label={`${p.name} 전화`}>📞</a></span>}
  </div>;
}
export function TheaterList({items,limit=30,empty='조건에 맞는 곳이 없어요.',chain:c0}:{items:Slim[];limit?:number;empty?:string;chain?:ChainKey}){
  const hasKm=items.some(p=>p.km!=null);
  const chains=CHAIN_ORDER.filter(k=>items.some(p=>p.chain===k));
  const [c,setC]=useState<ChainKey|'all'>(c0??'all');const [more,setMore]=useState(limit);
  const rows=useMemo(()=>{const r=items.filter(p=>c==='all'||p.chain===c);return hasKm?[...r].sort((x,y)=>x.km!-y.km!):r;},[items,c,hasKm]);
  return <div className="mv-list">
    {chains.length>1&&!c0&&<div className="mv-chips" role="group" aria-label="체인">
      <button type="button" className={c==='all'?'mv-chip on':'mv-chip'} onClick={()=>{setC('all');setMore(limit);}}>전체 <small>{n(items.length)}</small></button>
      {chains.map(x=><button type="button" key={x} className={c===x?'mv-chip on':'mv-chip'} aria-pressed={c===x} onClick={()=>{setC(x);setMore(limit);}}>{CHAINS[x].label} <small>{n(items.filter(p=>p.chain===x).length)}</small></button>)}</div>}
    {!rows.length?<p className="muted">{empty}</p>:<div className="mv-cards">{rows.slice(0,more).map(p=><TheaterCard key={p.id} p={p}/>)}</div>}
    {rows.length>more&&<button type="button" className="mv-more" onClick={()=>setMore(x=>x+limit)}>더 보기 ({n(rows.length-more)}곳 남음)</button>}
  </div>;
}
