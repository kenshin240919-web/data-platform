'use client';
// 목록: 종류 칩(정비소·검사소·세차장·배출가스), 정비 종류 칩(종합·소형·전문), 지금 영업 중(시간 정보가 있는 곳만), 가까운 순.
import {useEffect,useMemo,useState} from 'react';
import {centerPath,hoursLine,KIND_ORDER,KINDS,km,kstNow,n,openNow,years,type Kind,type Slim} from '../../lib/fmt';

export function useNow(){const [now,setNow]=useState<ReturnType<typeof kstNow>|null>(null);
  useEffect(()=>{const f=()=>setNow(kstNow());f();const t=setInterval(f,60e3);return ()=>clearInterval(t);},[]);return now;}
export function CenterCard({p,now}:{p:Slim;now:ReturnType<typeof kstNow>|null}){
  const o=now?openNow(p,now):null,y=years(p.since);
  return <a className={`sv-card ${o?(o.open?'open':'closed'):''}`} href={centerPath(p.id)}>
    <span className="sv-kind" aria-hidden="true">{KINDS[p.kind].icon}</span>
    <span className="sv-card-body"><b>{p.name}</b>
      <small>{p.km!=null&&<>{km(p.km)} · </>}{p.sub&&<span className="sv-tag">{p.sub}</span>}{o?o.label:p.kind==='inspect'||p.hours.wk?hoursLine(p):KINDS[p.kind].label}</small>
      <small className="muted">{[p.addr,y?`${y}년째`:null].filter(Boolean).join(' · ')}</small></span>
    {p.tel&&<span className="sv-tel" aria-hidden="true">📞</span>}
  </a>;
}
export function CenterList({items,limit=30,empty='조건에 맞는 곳이 없어요.',kind:k0}:{items:Slim[];limit?:number;empty?:string;kind?:Kind|'all'}){
  const now=useNow();const hasKm=items.some(p=>p.km!=null);
  const kinds=KIND_ORDER.filter(k=>items.some(p=>p.kind===k));
  const [k,setK]=useState<Kind|'all'>(k0??(kinds.length===1?kinds[0]:'all'));const [sub,setSub]=useState('');const [open,setOpen]=useState(false);const [more,setMore]=useState(limit);
  const subs=useMemo(()=>[...new Set(items.filter(p=>p.kind===k&&p.sub).map(p=>p.sub!))],[items,k]);
  const rows=useMemo(()=>{const r=items.filter(p=>(k==='all'||p.kind===k)&&(!sub||p.sub===sub)&&(!open||(now&&openNow(p,now)?.open)));
    return hasKm?[...r].sort((a,b)=>a.km!-b.km!):r;},[items,k,sub,open,now,hasKm]);
  const reset=()=>setMore(limit);
  return <div className="sv-list">
    {kinds.length>1&&<div className="sv-chips" role="group" aria-label="종류">
      <button type="button" className={k==='all'?'sv-chip on':'sv-chip'} onClick={()=>{setK('all');setSub('');reset();}}>전체 <small>{n(items.length)}</small></button>
      {kinds.map(x=><button type="button" key={x} className={k===x?'sv-chip on':'sv-chip'} aria-pressed={k===x} onClick={()=>{setK(x);setSub('');reset();}}>{KINDS[x].icon} {KINDS[x].label} <small>{n(items.filter(p=>p.kind===x).length)}</small></button>)}</div>}
    {(subs.length>1||items.some(p=>openNow(p)))&&<div className="sv-chips" role="group" aria-label="세부 조건">
      {subs.length>1&&subs.map(s=><button type="button" key={s} className={sub===s?'sv-chip on':'sv-chip'} onClick={()=>{setSub(sub===s?'':s);reset();}}>{s} <small>{n(items.filter(p=>p.kind===k&&p.sub===s).length)}</small></button>)}
      <button type="button" className={open?'sv-chip on':'sv-chip'} onClick={()=>{setOpen(!open);reset();}}>🟢 지금 영업 중</button></div>}
    {!rows.length?<p className="muted">{open?'영업 시간이 등록된 곳 중 지금 여는 곳이 없어요. 시간 정보가 없는 곳은 전화로 확인하세요.':empty}</p>
      :<div className="sv-cards">{rows.slice(0,more).map(p=><CenterCard key={p.id} p={p} now={now}/>)}</div>}
    {rows.length>more&&<button type="button" className="sv-more" onClick={()=>setMore(x=>x+limit)}>더 보기 ({n(rows.length-more)}곳 남음)</button>}
  </div>;
}
