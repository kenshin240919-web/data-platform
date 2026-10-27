'use client';
import {useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {CATS,marketPath,n,storePath,type SlimMarket,type SlimStore} from '../../lib/fmt';
export function SearchBox(){
  const sp=useSearchParams();const [q,setQ]=useState(sp.get('q')??'');const [res,setRes]=useState<{markets:SlimMarket[];stores:SlimStore[];total:number}|null>(null);
  useEffect(()=>{const v=q.trim();if(!v){setRes(null);return;}let live=true;const t=setTimeout(()=>fetch('/api/search?q='+encodeURIComponent(v)).then(r=>r.json()).then(d=>{if(live)setRes(d);}).catch(()=>{}),250);return ()=>{live=false;clearTimeout(t);};},[q]);
  return <>
    <form role="search" className="mk-search" onSubmit={e=>e.preventDefault()}><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="가게·시장 이름이나 품목 (예: 망원시장, 통인시장 떡볶이, 수원 정육)" aria-label="온누리상품권 가맹점 검색" autoComplete="off"/></form>
    {res&&<>
      {res.markets.length>0&&<><h2 className="mk-list-title">🏪 시장·상점가 <span className="muted">{n(res.markets.length)}곳</span></h2>
        <div className="mk-cards">{res.markets.map(m=><a key={m.id} className="mk-card" href={marketPath(m.id)}><span className="mk-icon" aria-hidden="true">🏪</span><span className="mk-card-body"><b>{m.name}</b><small>{m.region_name}</small></span><span className="mk-card-n"><b>{n(m.n)}</b><small>가맹점</small></span></a>)}</div></>}
      <h2 className="mk-list-title">‘{q.trim()}’ 가맹점 <span className="muted">{n(res.total)}곳</span></h2>
      {res.stores.length?<ul className="mk-stores">{res.stores.map(s=><li key={s.id}><a href={storePath(s.id)}><b>{s.name}</b><small>{CATS[s.cat].icon} {s.item??CATS[s.cat].label} · {s.market}</small></a></li>)}</ul>
        :<p className="muted">맞는 가게가 없어요. 시장 이름이나 동네로도 찾아보세요.</p>}
    </>}
  </>;
}
