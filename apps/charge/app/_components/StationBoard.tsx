'use client';
import {Fragment,useEffect,useMemo,useRef,useState} from 'react';
import {AdSlot} from '@guidejung/ui/ads';
import type {ChargeRegion} from '../../lib/regions';
import type {Station,StationsResponse} from '../../lib/types';
import type {SnapRegion} from '../../lib/snapshot';
import {STAT,TONE_LABEL,ago,distanceKm,fmtKm,is24h,isFast,summary,typeName} from '../../lib/format';

const TRIP='https://trip.guidejung.com',WEATHER='https://weather.guidejung.com';
const KEY='charge.recent';
export function remember(code:string,label:string){try{const list=JSON.parse(localStorage.getItem(KEY)??'[]') as {code:string;label:string}[];localStorage.setItem(KEY,JSON.stringify([{code,label},...list.filter(i=>i.code!==code)].slice(0,6)));}catch{}}
export function recent():{code:string;label:string}[]{try{return JSON.parse(localStorage.getItem(KEY)??'[]');}catch{return [];}}
const fmtTime=(t:string)=>t?`${+t.slice(4,6)}.${+t.slice(6,8)} ${t.slice(8,10)}:${t.slice(10,12)}`:'';
type Filters={ok:boolean;fast:boolean;free:boolean;h24:boolean};

/** 지역 충전소: 3초 답(지금 사용 가능 급속 수) → 조건 칩 → 상태 색깔 목록 → 펼치면 충전기별 상태·길찾기·주변 여행지·날씨. */
export function StationBoard({region,label,origin,snap}:{region:ChargeRegion;label:string;origin?:{lat:number;lon:number}|null;snap?:SnapRegion|null}){
  const [data,setData]=useState<StationsResponse|null>(null);const [failed,setFailed]=useState(false);
  const [f,setF]=useState<Filters>({ok:false,fast:false,free:false,h24:false});const [limit,setLimit]=useState(30);const [open,setOpen]=useState<string|null>(null);const linked=useRef(false);
  useEffect(()=>{setData(null);setFailed(false);setLimit(30);linked.current=false;remember(region.code,label);
    const ctrl=new AbortController();
    const get=()=>fetch(`/api/stations?code=${region.code}`,{signal:ctrl.signal,cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json() as Promise<StationsResponse>;});
    let timer:ReturnType<typeof setTimeout>|undefined;
    // An older copy shows at once; the Worker refreshes it in the background, so ask again shortly for the new status.
    const poll=(n:number)=>{timer=setTimeout(()=>get().then(d=>{if(!d.refreshing)setData(d);else if(n>1)poll(n-1);},()=>{}),6000);};
    get().then(d=>{setData(d);if(d.refreshing)poll(5);},e=>{if(e.name!=='AbortError')setFailed(true);});
    return ()=>{ctrl.abort();clearTimeout(timer);};},[region.code,label]);

  const rows=useMemo(()=>{
    if(!data)return [];
    return data.stations.map(s=>({s,sum:summary(s),km:origin?distanceKm(origin.lat,origin.lon,s.lat,s.lng):null}))
      .filter(({s,sum})=>(!f.ok||sum.ok>0)&&(!f.fast||sum.fast>0)&&(!f.free||s.freeParking)&&(!f.h24||is24h(s)))
      .sort((a,b)=>a.km!==null&&b.km!==null?a.km-b.km:(b.sum.fastOk-a.sum.fastOk)||(b.sum.ok-a.sum.ok));
  },[data,f,origin]);
  // Shared links (#station-ID) open that station once the list is loaded, even if it sits beyond the first page.
  useEffect(()=>{
    if(linked.current||!rows.length)return;linked.current=true;
    const id=decodeURIComponent(location.hash.match(/^#station-(.+)$/)?.[1]??'');const i=rows.findIndex(r=>r.s.id===id);
    if(i<0)return;setOpen(id);setLimit(l=>Math.max(l,i+1));
    setTimeout(()=>document.getElementById(`station-${id}`)?.scrollIntoView({block:'start'}),80);
  },[rows]);

  if(failed)return <><p className="notice" role="alert">실시간 상태를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>{snap&&<StaticList snap={snap} label={label}/>}</>;
  if(!data)return snap?<StaticList snap={snap} label={label} loading/>:<div className="loading" role="status">{label} 충전소와 실시간 상태를 불러오고 있습니다.</div>;
  const all=data.stations.map(summary);const fastOk=all.reduce((n,s)=>n+s.fastOk,0),ok=all.reduce((n,s)=>n+s.ok,0),chargers=all.reduce((n,s)=>n+s.total,0);
  const near=origin?rows.filter(r=>r.km!==null&&r.km<=1).reduce((n,r)=>n+r.sum.fastOk,0):null;
  const chip=(k:keyof Filters,text:string)=><button type="button" className={`chip${f[k]?' on':''}`} aria-pressed={f[k]} onClick={()=>{setF({...f,[k]:!f[k]});setLimit(30);}}>{text}</button>;

  return <div className="ev">
    <section className="ev-hero">
      <p className="ev-answer">{near!==null?<>내 주변 1km 안에 지금 충전 가능한 급속 <b>{near}대</b></>:<>{label}에 지금 충전 가능한 급속 <b>{fastOk}대</b></>}</p>
      <p className="ev-sub">충전소 {data.stations.length.toLocaleString()}곳 · 충전기 {chargers.toLocaleString()}대 중 지금 사용 가능 {ok.toLocaleString()}대 · {fmtTime(data.fetched)} 기준{data.stale?' (지연된 정보)':data.refreshing?' · 최신 상태 확인 중':''}</p>
    </section>
    <div className="ev-chips">{chip('ok','지금 사용 가능')}{chip('fast','급속만')}{chip('free','무료 주차')}{chip('h24','24시간')}</div>
    <p className="muted small">{rows.length.toLocaleString()}곳 · {origin?'가까운 순':'사용 가능한 급속이 많은 순'}</p>
    <ul className="ev-list">{rows.slice(0,limit).map(({s,sum,km},i)=>{const isOpen=open===s.id;
      return <Fragment key={s.id}>{i===5&&<li className="ev-ad"><AdSlot/></li>}<li id={`station-${s.id}`} className={`ev-item tone-${sum.tone}${isOpen?' open':''}`}>
        <button type="button" className="ev-row" aria-expanded={isOpen} onClick={()=>{setOpen(isOpen?null:s.id);history.replaceState(null,'',isOpen?location.pathname:`#station-${s.id}`);}}>
          <span className="ev-name"><b>{s.name}</b><small>{TONE_LABEL[sum.tone as keyof typeof TONE_LABEL]}</small></span>
          <span className="ev-count"><b>{sum.ok}</b>/{sum.total}<small>사용 가능</small></span>
          <span className="ev-meta">{sum.fast>0&&<span className="tag fast">급속 {sum.fastOk}/{sum.fast}</span>}{sum.maxKw>0&&<span className="tag">최대 {sum.maxKw}kW</span>}{s.freeParking&&<span className="tag">무료 주차</span>}{is24h(s)&&<span className="tag">24시간</span>}{km!==null&&<span className="tag dist">{fmtKm(km)}</span>}</span>
        </button>
        {isOpen&&<div className="ev-detail">
          <p className="small">{s.addr}</p>
          <ul className="ev-chargers">{s.chargers.map(c=>{const st=STAT[c.stat]??STAT[9];return <li key={c.id} className={`st-${st.tone}`}><span>{c.id}번</span><span>{typeName(c.type)}{c.kw?` · ${c.kw}kW`:''}{isFast(c)?' · 급속':''}</span><b>{st.text}</b><small>{ago(c.upd)}</small></li>;})}</ul>
          <dl className="ev-facts"><div><dt>이용시간</dt><dd>{s.useTime||'확인 필요'}</dd></div><div><dt>운영기관</dt><dd>{s.busi}{s.call&&<> · <a href={`tel:${s.call}`}>{s.call}</a></>}</dd></div><div><dt>주차</dt><dd>{s.freeParking?'무료 주차':'유료이거나 확인 필요'}</dd></div>{s.limited&&<div><dt>이용 제한</dt><dd>{s.limited}</dd></div>}</dl>
          <div className="ev-actions">
            <a className="button" href={`https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.lat},${s.lng}`} target="_blank" rel="noopener noreferrer">🧭 길찾기</a>
            <a className="ev-link" href={`${TRIP}/search?lat=${s.lat}&lon=${s.lng}&radius_km=3`}>🚗 충전하는 동안 갈 만한 곳</a>
            <a className="ev-link" href={`${WEATHER}/region/${region.weather}`}>🌤️ {label} 날씨</a>
          </div>
        </div>}
      </li></Fragment>;})}</ul>
    {rows.length>limit&&<button type="button" className="ev-more" onClick={()=>setLimit(limit+30)}>충전소 더 보기 ({(rows.length-limit).toLocaleString()}곳 남음)</button>}
    {!rows.length&&<p className="notice">조건에 맞는 충전소가 없습니다. 조건을 줄여 보세요.</p>}
    <AdSlot/>
  </div>;
}

/** Daily snapshot shown (and prerendered for search engines) until the live list arrives: counts and the largest stations. */
function StaticList({snap,label,loading}:{snap:SnapRegion;label:string;loading?:boolean}){
  return <div className="ev">
    <section className="ev-hero">
      <p className="ev-answer">{label} 충전소 <b>{snap.stations.toLocaleString()}곳</b></p>
      <p className="ev-sub">충전기 {snap.chargers.toLocaleString()}대(급속 {snap.fast.toLocaleString()}대) · 무료 주차 {snap.freeParking.toLocaleString()}곳 · 24시간 {snap.h24.toLocaleString()}곳{loading&&<> · <span role="status">지금 사용 가능한 충전기를 확인하고 있어요…</span></>}</p>
    </section>
    <p className="muted small">충전기가 많은 충전소 {snap.list.length}곳{snap.stations>snap.list.length?` (전체 ${snap.stations.toLocaleString()}곳은 실시간 목록에서)`:''}</p>
    <ul className="ev-list">{snap.list.map(s=><li key={s.id} id={`station-${s.id}`} className="ev-item">
      <div className="ev-row">
        <span className="ev-name"><b>{s.name}</b><small>{s.addr}</small></span>
        <span className="ev-count"><b>{s.fast+s.slow}</b>대<small>충전기</small></span>
        <span className="ev-meta">{s.fast>0&&<span className="tag fast">급속 {s.fast}</span>}{s.slow>0&&<span className="tag">완속 {s.slow}</span>}{s.maxKw>0&&<span className="tag">최대 {s.maxKw}kW</span>}{s.freeParking&&<span className="tag">무료 주차</span>}{/24/.test(s.useTime)&&<span className="tag">24시간</span>}</span>
      </div>
    </li>)}</ul>
  </div>;
}
