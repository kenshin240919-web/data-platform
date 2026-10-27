'use client';
// 약국 목록: 지금 시각으로 영업 상태를 브라우저에서 계산(1분마다 다시), 조건 칩(지금 영업·밤 10시 이후·일요일·공휴일).
import {useEffect,useMemo,useState} from 'react';
import {CONDITIONS,km,kstNow,pharmacyPath,statusOf,weekLine,type Pharmacy} from '../../lib/fmt';

export type Item=Pick<Pharmacy,'id'|'name'|'address'|'tel'|'hours'|'lat'|'lon'>&{km?:number};
type Filter='all'|'open'|keyof typeof CONDITIONS;
export function useNow(){const [now,setNow]=useState<ReturnType<typeof kstNow>|null>(null);
  useEffect(()=>{const f=()=>setNow(kstNow());f();const t=setInterval(f,60e3);return ()=>clearInterval(t);},[]);return now;}
export function StatusList({items,initial='all',sortOpen=true,limit=40,empty='조건에 맞는 약국이 없어요.'}:{items:Item[];initial?:Filter;sortOpen?:boolean;limit?:number;empty?:string}){
  const now=useNow();const [f,setF]=useState<Filter>(initial);const [more,setMore]=useState(limit);
  const rows=useMemo(()=>{
    const withS=items.map(p=>({p,s:now?statusOf(p,now):null}));
    const pass=withS.filter(({p,s})=>f==='all'?true:f==='open'?s?.state!=='closed':CONDITIONS[f].test(p));
    // 거리가 있으면 거리순, 없으면 영업 중인 곳 먼저.
    return sortOpen&&now&&items[0]?.km==null?[...pass].sort((a,b)=>Number(a.s?.state==='closed')-Number(b.s?.state==='closed')):pass;
  },[items,now,f,sortOpen]);
  const count=(x:Filter)=>x==='all'?items.length:x==='open'?(now?items.filter(p=>statusOf(p,now).state!=='closed').length:0):items.filter(CONDITIONS[x].test).length;
  const chips:[Filter,string][]=[['all','전체'],['open','🟢 지금 영업 중'],['night','🌙 밤 10시 이후'],['sunday','일요일'],['holiday','공휴일']];
  return <div className="ph-list">
    <div className="ph-chips" role="group" aria-label="조건">{chips.map(([k,l])=><button type="button" key={k} className={f===k?'ph-chip on':'ph-chip'} aria-pressed={f===k} onClick={()=>{setF(k);setMore(limit);}}>{l} <small>{count(k).toLocaleString('ko-KR')}</small></button>)}</div>
    {!rows.length?<p className="muted">{empty}</p>:<div className="ph-cards">{rows.slice(0,more).map(({p,s})=><div key={p.id} className={`ph-card ${s?.state??''}`}>
      <a className="ph-card-main" data-gj-pt={p.lat!=null&&p.lon!=null?`${p.lat},${p.lon}`:undefined} data-gj-name={p.name} href={pharmacyPath(p.id)}><span className="ph-dot" aria-hidden="true"></span><span className="ph-card-body"><b>{p.name}</b>
        <small>{p.km!=null&&<>{km(p.km)} · </>}{s?s.label:weekLine(p)}</small><small className="muted">{weekLine(p)}</small></span></a>
      {p.tel&&<a className="ph-tel" href={`tel:${p.tel.replace(/[^0-9]/g,'')}`} aria-label={`${p.name} 전화`}>📞</a>}
    </div>)}</div>}
    {rows.length>more&&<button type="button" className="ph-more" onClick={()=>setMore(m=>m+limit)}>더 보기 ({(rows.length-more).toLocaleString('ko-KR')}곳 남음)</button>}
  </div>;
}
