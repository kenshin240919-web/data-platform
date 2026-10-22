'use client';
import {useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {LotList} from './LotList';
import type {Slim} from '../../lib/fmt';
export function SearchBox(){
  const sp=useSearchParams();const [q,setQ]=useState(sp.get('q')??'');const [res,setRes]=useState<{total:number;items:Slim[]}|null>(null);
  useEffect(()=>{const v=q.trim();if(!v){setRes(null);return;}let live=true;const t=setTimeout(()=>fetch('/api/search?q='+encodeURIComponent(v)).then(r=>r.json()).then(d=>{if(live)setRes(d);}).catch(()=>{}),250);return ()=>{live=false;clearTimeout(t);};},[q]);
  return <>
    <form role="search" className="pk-search" onSubmit={e=>e.preventDefault()}><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="주차장 이름·동네·도로명 (예: 역삼동, 시청)" aria-label="주차장 검색" autoComplete="off"/></form>
    {res&&<><h2 className="pk-list-title">‘{q.trim()}’ 검색 결과 <span className="muted">{res.total.toLocaleString('ko-KR')}곳</span></h2><LotList items={res.items} empty="맞는 주차장이 없어요. 동네 이름으로도 찾아보세요."/></>}
  </>;
}
