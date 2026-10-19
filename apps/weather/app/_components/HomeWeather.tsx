'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {broadArea,LocateCard,nearest,useMyPosition} from '@guidejung/ui/geo';
import type {Region} from '../../lib/types';
import {WeatherPanel} from './WeatherPanel';
import {lastViewed} from './Recent';

type Slim=Region&{label:string};
/**
 * Home: 내 위치(허용한 적 있으면 바로) → 최근 본 지역 → 접속 위치(IP) 부근 → 기본 지역 순으로 날씨를 바로 보여 준다.
 * 위치를 아직 허용하지 않았으면 이유를 적은 카드로 한 번만 권한을 묻는다.
 */
export function HomeWeather({regions,fallback}:{regions:Slim[];fallback:string}){
  const {pos,status,request}=useMyPosition();
  const [code,setCode]=useState(fallback);const [picked,setPicked]=useState(false);const [fromLast,setFromLast]=useState(false);
  useEffect(()=>{const last=lastViewed();if(last&&regions.some(r=>r.code===last.code)){setCode(last.code);setFromLast(true);}},[regions]);
  useEffect(()=>{if(!pos||picked||(fromLast&&!pos.precise))return;setCode(nearest(regions,pos.lat,pos.lon).code);},[pos,picked,fromLast,regions]);
  const region=regions.find(r=>r.code===code)??regions[0];
  const mine=!!pos?.precise&&!picked;
  return <>
    <div className="wx-picker">
      <h1>{mine?`내 위치(${region.label})`:region.label} 날씨</h1>
      {!pos?.precise&&<LocateCard title="내 위치 날씨 바로 보기" desc="지금 있는 곳의 날씨·미세먼지·우산 필요 여부를 먼저 보여 드려요" status={status} onClick={()=>{setPicked(false);request();}} approxLabel={pos?broadArea(regions,pos.lat,pos.lon):undefined}/>}
      <div className="wx-picker-actions">
        <label className="sr-only" htmlFor="region-select">지역 선택</label>
        <select id="region-select" value={region.code} onChange={e=>{setPicked(true);setCode(e.target.value);}}>{regions.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select>
        <Link className="text-link" href={`/region/${region.code}`}>{region.label} 자세히 →</Link>
        {pos?.precise&&picked&&<button type="button" className="text-link" onClick={()=>setPicked(false)}>📍 내 위치로</button>}
      </div>
    </div>
    <WeatherPanel region={region} label={region.label}/>
  </>;
}
