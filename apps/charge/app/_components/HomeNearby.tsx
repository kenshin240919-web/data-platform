'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {distanceKm} from '../../lib/format';
import {broadArea,LocateCard,nearest,useMyPosition,here} from '@guidejung/ui/geo';
import type {ChargeRegion} from '../../lib/regions';
import {StationBoard,recent} from './StationBoard';

type R=ChargeRegion&{label:string};
/**
 * 메인: 내 위치를 허용한 적 있으면 바로 가까운 순 충전소, 아니면 최근 본 지역 → 접속 위치(IP) 부근 → 기본 지역.
 * 위치를 아직 허용하지 않았으면 이유를 적은 카드로 한 번만 권한을 묻는다.
 */
export function HomeNearby({regions,fallback}:{regions:R[];fallback:string}){
  const {pos,status,request}=useMyPosition();
  const [code,setCode]=useState(fallback);const [picked,setPicked]=useState(false);const [fromRecent,setFromRecent]=useState(false);
  const [recents,setRecents]=useState<{code:string;label:string}[]>([]);
  useEffect(()=>{const r=recent();setRecents(r);if(r[0]&&regions.some(x=>x.code===r[0].code)){setCode(r[0].code);setFromRecent(true);}},[regions]);
  useEffect(()=>{if(!pos||picked||(fromRecent&&!pos.precise))return;setCode(nearest(regions,here(pos).lat,here(pos).lon).code);},[pos,picked,fromRecent,regions]);
  const region=regions.find(r=>r.code===code)??regions[0];
  const origin=pos?.precise&&!picked?here(pos):null;
  // 내 주변: also the next districts whose centre is within 15km (at most 3), so a spot near a border is not cut off.
  const extra=useMemo(()=>origin?regions.filter(r=>r.code!==region.code).map(r=>({r,d:distanceKm(origin.lat,origin.lon,r.lat,r.lon)})).filter(x=>x.d<=15).sort((a,b)=>a.d-b.d).slice(0,3).map(x=>x.r.code):[],[origin?.lat,origin?.lon,region.code,regions]);
  return <>
    <div className="ev-picker">
      {!pos?.precise&&<LocateCard title="내 주변 충전소 찾기" desc="가까운 순으로 지금 비어 있는 충전기를 보여 드려요" status={status} onClick={()=>{setPicked(false);request();}} approxLabel={pos?broadArea(regions,here(pos).lat,here(pos).lon):undefined}/>}
      <div className="ev-select"><label className="sr-only" htmlFor="region">지역</label><select id="region" value={region.code} onChange={e=>{setPicked(true);setCode(e.target.value);}}>{regions.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select>
        <Link className="text-link" href={`/region/${region.code}`}>{region.label} 충전소 전체 →</Link>
        {pos?.precise&&picked&&<button type="button" className="text-link" onClick={()=>setPicked(false)}>📍 내 주변으로</button>}</div>
      {recents.length>0&&<div className="chips"><span className="chips-label">최근 본 지역</span>{recents.map(r=><Link key={r.code} href={`/region/${r.code}`}>{r.label}</Link>)}</div>}
    </div>
    <StationBoard region={region} label={origin?'내 주변':region.label} origin={origin} extra={extra}/>
  </>;
}
