'use client';
import {useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {TheaterList} from './TheaterList';
import type {Slim} from '../../lib/fmt';
export function SearchBox(){
  const sp=useSearchParams();const [q,setQ]=useState(sp.get('q')??'');const [res,setRes]=useState<{total:number;items:Slim[]}|null>(null);
  useEffect(()=>{const v=q.trim();if(!v){setRes(null);return;}let live=true;const t=setTimeout(()=>fetch('/api/search?q='+encodeURIComponent(v)).then(r=>r.json()).then(d=>{if(live)setRes(d);}).catch(()=>{}),250);return ()=>{live=false;clearTimeout(t);};},[q]);
  return <>
    <form role="search" className="mv-search" onSubmit={e=>e.preventDefault()}><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="극장 이름이나 동네 (예: CGV 용산, 해운대 메가박스, 독립영화)" aria-label="영화관 검색" autoComplete="off"/></form>
    {res&&<><h2 className="mv-list-title">‘{q.trim()}’ 검색 결과 <span className="muted">{res.total.toLocaleString('ko-KR')}곳</span></h2><TheaterList items={res.items} empty="맞는 곳이 없어요. 동네 이름으로도 찾아보세요."/></>}
  </>;
}
