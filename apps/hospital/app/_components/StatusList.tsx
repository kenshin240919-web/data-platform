'use client';
// 병원 목록: 지금 시각으로 진료 상태를 브라우저에서 계산(1분마다 다시), 조건 칩(지금 진료 중·야간·일요일·공휴일).
import {useEffect,useMemo,useState} from 'react';
import {CONDITIONS,deptLabel,hospitalPath,km,kstNow,statusOf,weekLine,type Card} from '../../lib/fmt';

type Filter='all'|'open'|keyof typeof CONDITIONS;
export function useNow(){const [now,setNow]=useState<ReturnType<typeof kstNow>|null>(null);
  useEffect(()=>{const f=()=>setNow(kstNow());f();const t=setInterval(f,60e3);return ()=>clearInterval(t);},[]);return now;}
export function HospitalCard({c,now}:{c:Card;now:ReturnType<typeof kstNow>|null}){
  const s=now?statusOf(c,now):null;
  return <div className={`hp-card ${s?.state??''}`}>
    <a className="hp-card-main" data-gj-pt={c.lat!=null&&c.lon!=null?`${c.lat},${c.lon}`:undefined} data-gj-name={c.name} href={hospitalPath(c.id)}><span className="hp-dot" aria-hidden="true"></span><span className="hp-card-body"><b>{c.name}</b>
      <small>{c.km!=null&&<>{km(c.km)} · </>}{s?s.label:weekLine(c)}{c.er&&' · 🚑 응급실'}</small>
      <small className="muted">{[c.div,...c.depts.slice(0,4).map(deptLabel)].filter(Boolean).join(' · ')}</small></span></a>
    {c.tel&&<a className="hp-tel" href={`tel:${c.tel.replace(/[^0-9]/g,'')}`} aria-label={`${c.name} 전화`}>📞</a>}
  </div>;
}
export function StatusList({items,initial='all',sortOpen=true,limit=30,empty='조건에 맞는 병원이 없어요.'}:{items:Card[];initial?:Filter;sortOpen?:boolean;limit?:number;empty?:string}){
  const now=useNow();const [f,setF]=useState<Filter>(initial);const [more,setMore]=useState(limit);
  useEffect(()=>setF(initial),[initial]);
  const rows=useMemo(()=>{
    const pass=items.filter(p=>f==='all'?true:f==='open'?(now?statusOf(p,now).state!=='closed':true):CONDITIONS[f].test(p));
    return sortOpen&&now&&items[0]?.km==null?[...pass].sort((a,b)=>Number(statusOf(a,now).state==='closed')-Number(statusOf(b,now).state==='closed')):pass;
  },[items,now,f,sortOpen]);
  const count=(x:Filter)=>x==='all'?items.length:x==='open'?(now?items.filter(p=>statusOf(p,now).state!=='closed').length:0):items.filter(CONDITIONS[x].test).length;
  const chips:[Filter,string][]=[['all','전체'],['open','🟢 지금 진료 중'],['night','🌙 야간'],['sunday','일요일'],['holiday','공휴일']];
  return <div className="hp-list">
    <div className="hp-chips" role="group" aria-label="조건">{chips.map(([k,l])=><button type="button" key={k} className={f===k?'hp-chip on':'hp-chip'} aria-pressed={f===k} onClick={()=>{setF(k);setMore(limit);}}>{l} <small>{count(k).toLocaleString('ko-KR')}</small></button>)}</div>
    {!rows.length?<p className="muted">{empty}</p>:<div className="hp-cards">{rows.slice(0,more).map(c=><HospitalCard key={c.id} c={c} now={now}/>)}</div>}
    {rows.length>more&&<button type="button" className="hp-more" onClick={()=>setMore(m=>m+limit)}>더 보기 ({(rows.length-more).toLocaleString('ko-KR')}곳 남음)</button>}
  </div>;
}
