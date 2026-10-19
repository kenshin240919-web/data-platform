'use client';
import {useSearchParams} from 'next/navigation';
import {useState} from 'react';
import {LiveList} from './LiveList';
export function SearchPage(){
  const sp=useSearchParams();
  const [q,setQ]=useState(sp.get('q')??'');const [applied,setApplied]=useState(q);
  const num=(k:string)=>{const v=Number(sp.get(k));return sp.has(k)&&Number.isFinite(v)?v:undefined;};
  return <>
    <form className="ac-search" role="search" onSubmit={e=>{e.preventDefault();setApplied(q.trim());}}>
      <input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="학원 이름·동네·과정 (예: 대치동 수학, 피아노)" aria-label="학원 검색"/>
      <button type="submit">검색</button>
    </form>
    <LiveList title={applied?`‘${applied}’ 검색 결과`:'전국 학원'} query={{q:applied||undefined,region:sp.get('region')??undefined,subject:sp.get('subject')??undefined,grade:sp.get('grade')??undefined,lat:num('lat'),lon:num('lon'),km:num('km')}}/>
  </>;
}
