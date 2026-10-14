'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {ChargeRegion} from '../../lib/regions';
import {StationBoard,recent} from './StationBoard';

type R=ChargeRegion&{label:string};
/** 메인: 내 위치(또는 최근 본 지역) 충전소를 바로 보여 준다. */
export function HomeNearby({regions,fallback}:{regions:R[];fallback:string}){
  const [code,setCode]=useState(fallback);const [origin,setOrigin]=useState<{lat:number;lon:number}|null>(null);const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('');
  const [recents,setRecents]=useState<{code:string;label:string}[]>([]);
  useEffect(()=>{const r=recent();setRecents(r);if(r[0]&&regions.some(x=>x.code===r[0].code))setCode(r[0].code);},[regions]);
  const region=regions.find(r=>r.code===code)??regions[0];
  function locate(){
    if(!navigator.geolocation){setMsg('이 브라우저는 위치 확인을 지원하지 않습니다.');return;}
    setBusy(true);setMsg('');
    navigator.geolocation.getCurrentPosition(p=>{const {latitude:lat,longitude:lon}=p.coords;
      const best=regions.reduce((a,b)=>((b.lat-lat)**2+(b.lon-lon)**2)<((a.lat-lat)**2+(a.lon-lon)**2)?b:a);
      setOrigin({lat,lon});setCode(best.code);setBusy(false);},()=>{setBusy(false);setMsg('위치 권한이 없어 지역을 직접 골라 주세요.');},{timeout:10000,maximumAge:120000});
  }
  return <>
    <div className="ev-picker">
      <button type="button" className="ev-locate" onClick={locate} disabled={busy}><span aria-hidden="true">📍</span><span><b>{busy?'위치 확인 중…':'내 주변 충전소 찾기'}</b><small>가까운 순으로 지금 비어 있는 충전기를 보여 드려요</small></span></button>
      <div className="ev-select"><label className="sr-only" htmlFor="region">지역</label><select id="region" value={region.code} onChange={e=>{setOrigin(null);setCode(e.target.value);}}>{regions.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select><Link className="text-link" href={`/region/${region.code}`}>{region.label} 충전소 전체 →</Link></div>
      {msg&&<p className="muted small">{msg}</p>}
      {recents.length>0&&<div className="chips"><span className="chips-label">최근 본 지역</span>{recents.map(r=><Link key={r.code} href={`/region/${r.code}`}>{r.label}</Link>)}</div>}
    </div>
    <StationBoard region={region} label={origin?'내 주변':region.label} origin={origin}/>
  </>;
}
