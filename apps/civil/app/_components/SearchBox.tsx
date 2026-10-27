'use client';
import {useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {PlaceList} from './PlaceList';
import type {Slim} from '../../lib/fmt';
export function SearchBox(){
  const sp=useSearchParams();const [q,setQ]=useState(sp.get('q')??'');const [res,setRes]=useState<{total:number;items:Slim[]}|null>(null);
  useEffect(()=>{const v=q.trim();if(!v){setRes(null);return;}let live=true;const t=setTimeout(()=>fetch('/api/search?q='+encodeURIComponent(v)).then(r=>r.json()).then(d=>{if(live)setRes(d);}).catch(()=>{}),250);return ()=>{live=false;clearTimeout(t);};},[q]);
  return <>
    <form role="search" className="cv-search" onSubmit={e=>e.preventDefault()}><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="동네·기관 이름 (예: 역삼동, 서초구청, 광화문우체국)" aria-label="민원 장소 검색" autoComplete="off"/></form>
    {res&&<><h2 className="cv-list-title">‘{q.trim()}’ 검색 결과 <span className="muted">{res.total.toLocaleString('ko-KR')}곳</span></h2><PlaceList items={res.items} empty="맞는 곳이 없어요. 동네 이름으로도 찾아보세요."/></>}
  </>;
}
