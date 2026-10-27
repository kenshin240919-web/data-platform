'use client';
// 목록: 종류 칩, '지금 운영 중만' 칩, 가까운 순. 운영 상태는 1분마다 브라우저에서 다시 계산(무인민원발급기·우체국·여권·민원실).
import {useEffect,useMemo,useState} from 'react';
import {KIND_ORDER,KINDS,km,kstNow,n,placePath,stateOf,telHref,type Kind,type Slim} from '../../lib/fmt';

function useNow(){const [t,setT]=useState<ReturnType<typeof kstNow>|null>(null);useEffect(()=>{setT(kstNow());const i=setInterval(()=>setT(kstNow()),60e3);return ()=>clearInterval(i);},[]);return t;}
export function State({p,now}:{p:Slim;now:ReturnType<typeof kstNow>|null}){
  if(!now)return null;const s=stateOf(p,now);return <span className={`cv-state ${s.state}`}>{s.label}{s.guess?' (보통)':''}</span>;
}
export function PlaceCard({p,now}:{p:Slim;now:ReturnType<typeof kstNow>|null}){
  return <div className="cv-card">
    <a className="cv-card-main" data-gj-pt={p.lat!=null&&p.lon!=null?`${p.lat},${p.lon}`:undefined} data-gj-name={p.name} href={placePath(p.id)}>
      <span className="cv-kind" aria-hidden="true">{KINDS[p.kind].icon}</span>
      <span className="cv-card-body"><b>{p.name}</b>
        <small>{p.km!=null&&<span className="cv-km">{km(p.km)}</span>}<State p={p} now={now}/>{p.kind==='kiosk'&&p.docs>0&&<span className="cv-tag">서류 {n(p.docs)}종</span>}{p.spot&&<span className="cv-tag">{p.spot}</span>}</small>
        <small className="muted">{p.addr}</small></span></a>
    {p.tel&&<span className="cv-acts"><a href={telHref(p.tel)} aria-label={`${p.name} 전화`}>📞</a></span>}
  </div>;
}
export function PlaceList({items,limit=30,empty='조건에 맞는 곳이 없어요.',kind:k0}:{items:Slim[];limit?:number;empty?:string;kind?:Kind|'all'}){
  const now=useNow();
  const hasKm=items.some(p=>p.km!=null);
  const kinds=KIND_ORDER.filter(k=>items.some(p=>p.kind===k));
  const [k,setK]=useState<Kind|'all'>(k0??(kinds.length===1?kinds[0]:'all'));const [open,setOpen]=useState(false);const [more,setMore]=useState(limit);
  const rows=useMemo(()=>{const r=items.filter(p=>(k==='all'||p.kind===k)&&(!open||!now||stateOf(p,now).state!=='closed'));
    return hasKm?[...r].sort((a,b)=>a.km!-b.km!):r;},[items,k,open,now,hasKm]);
  const reset=()=>setMore(limit);
  return <div className="cv-list">
    <div className="cv-chips" role="group" aria-label="종류">
      {kinds.length>1&&<button type="button" className={k==='all'?'cv-chip on':'cv-chip'} onClick={()=>{setK('all');reset();}}>전체 <small>{n(items.length)}</small></button>}
      {kinds.length>1&&kinds.map(x=><button type="button" key={x} className={k===x?'cv-chip on':'cv-chip'} aria-pressed={k===x} onClick={()=>{setK(x);reset();}}>{KINDS[x].icon} {KINDS[x].label} <small>{n(items.filter(p=>p.kind===x).length)}</small></button>)}
      <button type="button" className={open?'cv-chip on':'cv-chip'} aria-pressed={open} onClick={()=>{setOpen(!open);reset();}}>🟢 지금 운영 중만</button>
    </div>
    {!rows.length?<p className="muted">{empty}</p>
      :<div className="cv-cards">{rows.slice(0,more).map(p=><PlaceCard key={p.id} p={p} now={now}/>)}</div>}
    {rows.length>more&&<button type="button" className="cv-more" onClick={()=>setMore(x=>x+limit)}>더 보기 ({n(rows.length-more)}곳 남음)</button>}
  </div>;
}
