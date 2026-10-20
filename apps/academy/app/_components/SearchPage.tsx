'use client';
import {useSearchParams} from 'next/navigation';
import {useState} from 'react';
import {useMyPosition} from '@guidejung/ui/geo';
import {SUBJECTS} from '../../lib/fmt';
import {LiveList} from './LiveList';
// 위치를 허용한 사람(정확한 위치)은 지역·좌표·검색어를 고르지 않았으면 내 주변 3km부터(10/20 사용자). ?near=0 이면 전국.
const NEAR_KM=3;
export function SearchPage(){
  const sp=useSearchParams();
  const {pos}=useMyPosition();
  const [q,setQ]=useState(sp.get('q')??'');const [applied,setApplied]=useState(q);
  const [nation,setNation]=useState(sp.get('near')==='0');
  const num=(k:string)=>{const v=Number(sp.get(k));return sp.has(k)&&Number.isFinite(v)?v:undefined;};
  const region=sp.get('region')??undefined,subject=sp.get('subject')??undefined;
  const near=!nation&&!applied&&!region&&!sp.has('lat')&&pos?.precise?pos:null;
  const label=subject?`${SUBJECTS[subject]??''} 학원`:'학원';
  return <>
    <form className="ac-search" role="search" onSubmit={e=>{e.preventDefault();setApplied(q.trim());}}>
      <input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="학원 이름·동네·과정 (예: 대치동 수학, 피아노)" aria-label="학원 검색"/>
      <button type="submit">검색</button>
    </form>
    {pos?.precise&&!applied&&!region&&<div className="ac-chips" role="group" aria-label="범위">
      <button type="button" className={near?'ac-chip on':'ac-chip'} aria-pressed={!!near} onClick={()=>setNation(false)}>📍 내 주변 {NEAR_KM}km</button>
      <button type="button" className={!near?'ac-chip on':'ac-chip'} aria-pressed={!near} onClick={()=>setNation(true)}>전국</button>
    </div>}
    <LiveList key={near?'near':'all'} title={applied?`‘${applied}’ 검색 결과`:near?`📍 내 주변 ${NEAR_KM}km ${label}`:`전국 ${label}`}
      query={near?{lat:near.lat,lon:near.lon,km:NEAR_KM,subject,grade:sp.get('grade')??undefined}:{q:applied||undefined,region,subject,grade:sp.get('grade')??undefined,lat:num('lat'),lon:num('lon'),km:num('km')}}
      empty={near?'내 주변에 조건에 맞는 학원이 없어요. ‘전국’을 눌러 넓혀 보세요.':undefined}/>
  </>;
}
