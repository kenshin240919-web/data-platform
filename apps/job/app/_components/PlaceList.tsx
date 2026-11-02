'use client';
// 목록: 종류 칩, 가까운 순(거리가 있으면). 직업소개소는 종류(인력·간병·가사 등) 칩도.
import {useMemo,useState} from 'react';
import {KIND_ORDER,KINDS,km,n,placePath,telHref,type Kind,type Slim} from '../../lib/fmt';

export function PlaceCard({p}:{p:Slim}){
  return <div className="jb-card">
    <a className="jb-card-main" data-gj-pt={p.lat!=null&&p.lon!=null?`${p.lat},${p.lon}`:undefined} data-gj-name={p.name} href={placePath(p.id)}>
      <span className="jb-kind" aria-hidden="true">{KINDS[p.kind].icon}</span>
      <span className="jb-card-body"><b>{p.name}</b>
        <small>{p.km!=null&&<span className="jb-km">{km(p.km)}</span>}<span className="jb-tag">{KINDS[p.kind].label}</span>{p.tags.map(t=><span key={t} className="jb-tag">{t}</span>)}</small>
        <small className="muted">{p.addr}</small></span></a>
    {p.tel&&<span className="jb-acts"><a href={telHref(p.tel)} aria-label={`${p.name} 전화`}>📞</a></span>}
  </div>;
}
export function PlaceList({items,limit=30,empty='조건에 맞는 곳이 없어요.',kind:k0}:{items:Slim[];limit?:number;empty?:string;kind?:Kind|'all'}){
  const hasKm=items.some(p=>p.km!=null);
  const kinds=KIND_ORDER.filter(k=>items.some(p=>p.kind===k));
  const [k,setK]=useState<Kind|'all'>(k0??(kinds.length===1?kinds[0]:'all'));const [tag,setTag]=useState('');const [more,setMore]=useState(limit);
  const tags=useMemo(()=>{const c=new Map<string,number>();for(const p of items)if(k==='all'||p.kind===k)for(const t of p.tags)if(!/^(개인|법인)$/.test(t))c.set(t,(c.get(t)??0)+1);return [...c].filter(([,v])=>v>=2).sort((a,b)=>b[1]-a[1]).slice(0,6);},[items,k]);
  const rows=useMemo(()=>{const r=items.filter(p=>(k==='all'||p.kind===k)&&(!tag||p.tags.includes(tag)));
    return hasKm?[...r].sort((a,b)=>a.km!-b.km!):r;},[items,k,tag,hasKm]);
  const reset=()=>setMore(limit);
  return <div className="jb-list">
    {(kinds.length>1||tags.length>1)&&<div className="jb-chips" role="group" aria-label="종류">
      {kinds.length>1&&<button type="button" className={k==='all'?'jb-chip on':'jb-chip'} onClick={()=>{setK('all');setTag('');reset();}}>전체 <small>{n(items.length)}</small></button>}
      {kinds.length>1&&kinds.map(x=><button type="button" key={x} className={k===x?'jb-chip on':'jb-chip'} aria-pressed={k===x} onClick={()=>{setK(x);setTag('');reset();}}>{KINDS[x].icon} {KINDS[x].label} <small>{n(items.filter(p=>p.kind===x).length)}</small></button>)}
      {tags.length>1&&tags.map(([t,v])=><button type="button" key={t} className={tag===t?'jb-chip on':'jb-chip'} aria-pressed={tag===t} onClick={()=>{setTag(tag===t?'':t);reset();}}>{t} <small>{n(v)}</small></button>)}
    </div>}
    {!rows.length?<p className="muted">{empty}</p>
      :<div className="jb-cards">{rows.slice(0,more).map(p=><PlaceCard key={p.id} p={p}/>)}</div>}
    {rows.length>more&&<button type="button" className="jb-more" onClick={()=>setMore(x=>x+limit)}>더 보기 ({n(rows.length-more)}곳 남음)</button>}
  </div>;
}
