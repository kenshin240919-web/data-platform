'use client';
// 목록: 종류 칩(동물병원·동물약국·펫호텔·카페·펫택시), 세부 칩(24시·동물메디컬센터 / 동물약국 / 고양이 카페 …), 가까운 순.
// 동물약국은 영업 시간이 있으면 지금 상태(영업 중·곧 닫음·닫음)를 1분마다 다시 계산. 카드마다 📞 전화 · 🧭 길찾기.
import {useEffect,useMemo,useState} from 'react';
import {KIND_ORDER,KINDS,km,mapUrl,n,placePath,sinceLine,stateOf,telHref,type Kind,type Slim} from '../../lib/fmt';

const isOpen=(p:Slim)=>{const s=stateOf(p);return !!s&&s.state!=='closed';};
function useTick(){const [t,setT]=useState(0);useEffect(()=>{setT(Date.now());const i=setInterval(()=>setT(Date.now()),60000);return ()=>clearInterval(i);},[]);return t;}
export function PlaceCard({p,tick}:{p:Slim;tick?:number}){
  const st=tick?stateOf(p):null;
  return <div className={`pt-card${st?' '+st.state:''}`}>
    <a className="pt-card-main" href={placePath(p.id)}>
      <span className="pt-kind" aria-hidden="true">{KINDS[p.kind].icon}</span>
      <span className="pt-card-body"><b>{p.name}</b>
        <small>{p.km!=null&&<span className="pt-km">{km(p.km)}</span>}{p.sub&&<span className={p.sub==='24시'?'pt-tag h24':'pt-tag'}>{p.sub}</span>}{st?<span className="pt-state"><i className="pt-dot"/>{st.label}</span>:sinceLine(p.since)}</small>
        <small className="muted">{p.addr}</small></span></a>
    <span className="pt-acts">{p.tel&&<a href={telHref(p.tel)} aria-label={`${p.name} 전화`}>📞</a>}<a href={mapUrl(p)} target="_blank" rel="noopener" aria-label={`${p.name} 길찾기`}>🧭</a></span>
  </div>;
}
export function PlaceList({items,limit=30,empty='조건에 맞는 곳이 없어요.',kind:k0}:{items:Slim[];limit?:number;empty?:string;kind?:Kind|'all'}){
  const tick=useTick();
  const hasKm=items.some(p=>p.km!=null);
  const kinds=KIND_ORDER.filter(k=>items.some(p=>p.kind===k));
  const [k,setK]=useState<Kind|'all'>(k0??(kinds.length===1?kinds[0]:'all'));const [sub,setSub]=useState('');const [open,setOpen]=useState(false);const [more,setMore]=useState(limit);
  const subs=useMemo(()=>k==='all'?[]:[...new Set(items.filter(p=>p.kind===k&&p.sub).map(p=>p.sub!))],[items,k]);
  const hasHours=k==='pharmacy'&&items.some(p=>p.kind==='pharmacy'&&p.hours);
  const rows=useMemo(()=>{const r=items.filter(p=>(k==='all'||p.kind===k)&&(!sub||p.sub===sub)&&(!open||isOpen(p)));
    return hasKm?[...r].sort((a,b)=>a.km!-b.km!):r;},[items,k,sub,open,hasKm,tick]);
  const reset=()=>setMore(limit);
  return <div className="pt-list">
    {kinds.length>1&&<div className="pt-chips" role="group" aria-label="종류">
      <button type="button" className={k==='all'?'pt-chip on':'pt-chip'} onClick={()=>{setK('all');setSub('');setOpen(false);reset();}}>전체 <small>{n(items.length)}</small></button>
      {kinds.map(x=><button type="button" key={x} className={k===x?'pt-chip on':'pt-chip'} aria-pressed={k===x} onClick={()=>{setK(x);setSub('');setOpen(false);reset();}}>{KINDS[x].icon} {KINDS[x].label} <small>{n(items.filter(p=>p.kind===x).length)}</small></button>)}</div>}
    {(subs.length>1||hasHours)&&<div className="pt-chips" role="group" aria-label="세부 조건">
      {hasHours&&<button type="button" className={open?'pt-chip on':'pt-chip'} aria-pressed={open} onClick={()=>{setOpen(!open);reset();}}>🟢 지금 문 연 곳</button>}
      {subs.length>1&&subs.map(s=><button type="button" key={s} className={sub===s?'pt-chip on':'pt-chip'} onClick={()=>{setSub(sub===s?'':s);reset();}}>{s} <small>{n(items.filter(p=>p.kind===k&&p.sub===s).length)}</small></button>)}</div>}
    {!rows.length?<p className="muted">{empty}</p>
      :<div className="pt-cards">{rows.slice(0,more).map(p=><PlaceCard key={p.id} p={p} tick={tick}/>)}</div>}
    {rows.length>more&&<button type="button" className="pt-more" onClick={()=>setMore(x=>x+limit)}>더 보기 ({n(rows.length-more)}곳 남음)</button>}
  </div>;
}
