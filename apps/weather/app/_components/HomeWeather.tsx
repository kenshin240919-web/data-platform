'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {Region} from '../../lib/types';
import {WeatherPanel} from './WeatherPanel';
import {lastViewed} from './Recent';

type Slim=Region&{label:string};
/** Home: show the visitor's last region (or 내 위치 / default) right away, with one tap to switch. */
export function HomeWeather({regions,fallback}:{regions:Slim[];fallback:string}){
  const [code,setCode]=useState(fallback);const [locating,setLocating]=useState(false);const [msg,setMsg]=useState('');
  useEffect(()=>{const last=lastViewed();if(last&&regions.some(r=>r.code===last.code))setCode(last.code);},[regions]);
  const region=regions.find(r=>r.code===code)??regions[0];
  function locate(){
    if(!navigator.geolocation){setMsg('이 브라우저는 위치 확인을 지원하지 않습니다.');return;}
    setLocating(true);setMsg('');
    navigator.geolocation.getCurrentPosition(p=>{
      const {latitude:lat,longitude:lon}=p.coords;
      const best=regions.reduce((a,b)=>((b.lat-lat)**2+((b.lon-lon)*Math.cos(lat*Math.PI/180))**2)<((a.lat-lat)**2+((a.lon-lon)*Math.cos(lat*Math.PI/180))**2)?b:a);
      setCode(best.code);setLocating(false);
    },()=>{setLocating(false);setMsg('위치 권한이 없어 지역을 직접 골라 주세요.');},{timeout:10000,maximumAge:600000});
  }
  return <>
    <div className="wx-picker">
      <h1>{region.label} 날씨</h1>
      <div className="wx-picker-actions">
        <button type="button" onClick={locate} disabled={locating}>{locating?'위치 확인 중…':'📍 내 위치 날씨'}</button>
        <label className="sr-only" htmlFor="region-select">지역 선택</label>
        <select id="region-select" value={region.code} onChange={e=>setCode(e.target.value)}>{regions.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select>
        <Link className="text-link" href={`/region/${region.code}`}>{region.label} 자세히 →</Link>
      </div>
      {msg&&<p className="muted small">{msg}</p>}
      <p className="muted small">위치는 가까운 지역을 고르는 데에만 쓰고 저장하거나 전송하지 않습니다.</p>
    </div>
    <WeatherPanel region={region} label={region.label}/>
  </>;
}
