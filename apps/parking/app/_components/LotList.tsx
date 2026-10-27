'use client';
// 주차장 목록: '몇 시간 세울 거예요?' 칩으로 예상 요금을 바꾸고(싼 순 정렬), 조건 칩(무료·24시간·지금 운영 중·주차장/길가).
import {useEffect,useMemo,useState} from 'react';
import {allDay,DURATIONS,dur,feeFor,feeLine,hoursLine,km,kstNow,lotPath,n,openNow,type Slim} from '../../lib/fmt';

type Filter='all'|'free'|'allday'|'open'|'off'|'street';
const TESTS:Record<Exclude<Filter,'all'|'open'>,(p:Slim)=>boolean>={free:p=>p.charge==='무료',allday:allDay,off:p=>p.type!=='노상',street:p=>p.type==='노상'};
export function useNow(){const [now,setNow]=useState<ReturnType<typeof kstNow>|null>(null);
  useEffect(()=>{const f=()=>setNow(kstNow());f();const t=setInterval(f,60e3);return ()=>clearInterval(t);},[]);return now;}
export function Price({p,m}:{p:Slim;m:number}){const w=feeFor(p,m);
  return <span className="pk-price">{w===0?<b className="pk-free">무료</b>:w!=null?<b className="pk-fee">{n(w)}원</b>:<span className="pk-unknown">요금 확인</span>}<small>{w===0?'':`${dur(m)} 예상`}</small></span>;}
export function LotList({items,limit=30,initialSort,empty='조건에 맞는 주차장이 없어요.',dur:d0=60}:{items:Slim[];limit?:number;initialSort?:'near'|'cheap';empty?:string;dur?:number}){
  const now=useNow();const hasKm=items.some(p=>p.km!=null);
  const [m,setM]=useState(d0);const [f,setF]=useState<Filter>('all');const [sort,setSort]=useState<'near'|'cheap'>(initialSort??(hasKm?'near':'cheap'));const [more,setMore]=useState(limit);
  const pass=(p:Slim,x:Filter)=>x==='all'?true:x==='open'?(now?openNow(p,now).open:true):TESTS[x](p);
  const rows=useMemo(()=>{const r=items.filter(p=>pass(p,f));
    if(sort==='cheap'){const fee=(p:Slim)=>feeFor(p,m)??Infinity;return [...r].sort((a,b)=>fee(a)-fee(b)||(a.km??0)-(b.km??0)||(b.spaces??0)-(a.spaces??0));}
    return hasKm?[...r].sort((a,b)=>a.km!-b.km!):r;
  },[items,f,sort,m,now]); // eslint-disable-line react-hooks/exhaustive-deps
  const chips:[Filter,string][]=[['all','전체'],['free','🆓 무료'],['allday','24시간'],['open','🟢 지금 운영 중'],['off','🅿️ 주차장'],['street','🛣️ 길가(노상)']];
  return <div className="pk-list">
    <div className="pk-dur" role="group" aria-label="주차 시간"><b>⏱️ 몇 시간 세울 거예요?</b>{DURATIONS.map(([v,l])=><button type="button" key={v} className={m===v?'pk-chip on':'pk-chip'} aria-pressed={m===v} onClick={()=>{setM(v);setSort('cheap');}}>{l}</button>)}</div>
    <div className="pk-chips" role="group" aria-label="조건">{chips.map(([k,l])=>{const c=items.filter(p=>pass(p,k)).length;return c||k==='all'?<button type="button" key={k} className={f===k?'pk-chip on':'pk-chip'} aria-pressed={f===k} onClick={()=>{setF(k);setMore(limit);}}>{l} <small>{n(c)}</small></button>:null;})}
      <span className="pk-sort">{hasKm&&<button type="button" className={sort==='near'?'pk-chip on':'pk-chip'} onClick={()=>setSort('near')}>가까운 순</button>}<button type="button" className={sort==='cheap'?'pk-chip on':'pk-chip'} onClick={()=>setSort('cheap')}>💰 싼 순</button></span></div>
    {!rows.length?<p className="muted">{empty}</p>:<div className="pk-cards">{rows.slice(0,more).map(p=>{const o=now?openNow(p,now):null;return <a key={p.id} className={`pk-card ${o?(o.open?'open':'closed'):''}`} data-gj-pt={p.lat!=null&&p.lon!=null?`${p.lat},${p.lon}`:undefined} data-gj-name={p.name} href={lotPath(p.id)}>
      <span className="pk-card-body"><b>{p.name}</b>
        <small>{p.km!=null&&<>{km(p.km)} · </>}{p.type&&<span className="pk-tag">{p.type==='노상'?'길가':p.type}</span>}{p.spaces?`${n(p.spaces)}면 · `:''}{o?o.label:hoursLine(p)}</small>
        <small className="muted">{feeLine(p)}</small></span>
      <Price p={p} m={m}/></a>;})}</div>}
    {rows.length>more&&<button type="button" className="pk-more" onClick={()=>setMore(x=>x+limit)}>더 보기 ({n(rows.length-more)}곳 남음)</button>}
  </div>;
}
