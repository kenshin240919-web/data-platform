'use client';
import {useSearchParams} from 'next/navigation';
import {useState} from 'react';
import {useMyPosition} from '@guidejung/ui/geo';
import {CONDITIONS,DEPTS} from '../../lib/fmt';
import {LiveList} from '../_components/LiveList';
// 검색어가 없으면: 위치를 허용했으면 내 주변 3km, 아니면 과목 전국 목록.
export function SearchBox(){
  const sp=useSearchParams();const [q,setQ]=useState(sp.get('q')??'');const [applied,setApplied]=useState(q);const dept=sp.get('dept')??undefined;const c=sp.get('cond');const cond=c==='night'||c==='sunday'||c==='holiday'?c:undefined;
  const {pos}=useMyPosition();const near=!applied&&pos?.precise?pos:null;
  const label=(cond?CONDITIONS[cond].label+' ':'')+(dept?DEPTS[dept]??'병원':'병원');
  return <>
    <form role="search" className="hp-search" onSubmit={e=>{e.preventDefault();setApplied(q.trim());}}><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="병원 이름·동네 (예: 서울아산병원, 대치동 소아과)" aria-label="병원 검색"/><button type="submit">검색</button></form>
    {(applied||dept||cond||near)&&<LiveList key={`${applied}|${near?'n':''}|${cond??''}`} title={applied?`‘${applied}’ 검색 결과`:near?`📍 내 주변 3km ${label}`:`전국 ${label}`}
      query={near?{lat:near.lat,lon:near.lon,km:3,dept}:{q:applied||undefined,dept,cond}} filter={cond} empty="조건에 맞는 병원이 없어요."/>}
  </>;
}
