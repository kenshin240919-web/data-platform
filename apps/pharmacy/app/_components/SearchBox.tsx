'use client';
import {useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {StatusList,type Item} from './StatusList';
export function SearchBox(){
  const sp=useSearchParams();const [q,setQ]=useState(sp.get('q')??'');const [res,setRes]=useState<{total:number;items:Item[]}|null>(null);
  useEffect(()=>{const v=q.trim();if(!v){setRes(null);return;}let live=true;const t=setTimeout(()=>fetch('/api/search?q='+encodeURIComponent(v)).then(r=>r.json()).then(d=>{if(live)setRes(d);}).catch(()=>{}),250);return ()=>{live=false;clearTimeout(t);};},[q]);
  return <>
    <form role="search" className="ph-search" onSubmit={e=>e.preventDefault()}><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="약국 이름·동네 (예: 온누리약국, 대치동)" aria-label="약국 검색" autoComplete="off"/></form>
    {res&&<><h2 className="ph-list-title">‘{q.trim()}’ 검색 결과 <span className="muted">{res.total.toLocaleString('ko-KR')}곳</span></h2><StatusList items={res.items} empty="이름이 맞는 약국이 없어요. 동네 이름으로도 찾아보세요."/></>}
  </>;
}
