'use client';
// 시장·지역 페이지의 가맹점 목록: 품목 칩 · '디지털 결제 되는 곳' · '올해 새로 가맹' 칩, 60곳씩 더 보기. 가게를 누르면 상세(위치·길찾기).
import {useMemo,useState} from 'react';
import {CAT_ORDER,CATS,n,storePath,type Cat} from '../../lib/fmt';
export type Row={id:string;name:string;cat:Cat;item:string|null;d:0|1;y:number|null;m?:string};
export function StoreTable({rows,latest,limit=60,cat:c0}:{rows:Row[];latest?:number|null;limit?:number;cat?:Cat}){
  const [cat,setCat]=useState<Cat|'all'>(c0??'all');const [digital,setDigital]=useState(false);const [fresh,setFresh]=useState(false);const [more,setMore]=useState(limit);
  const counts=useMemo(()=>{const c={} as Record<Cat,number>;for(const r of rows)c[r.cat]=(c[r.cat]??0)+1;return c;},[rows]);
  const cats=CAT_ORDER.filter(c=>counts[c]);
  const list=useMemo(()=>rows.filter(r=>(cat==='all'||r.cat===cat)&&(!digital||r.d)&&(!fresh||r.y===latest)),[rows,cat,digital,fresh,latest]);
  const newCount=latest?rows.filter(r=>r.y===latest).length:0;
  const reset=()=>setMore(limit);
  return <div className="mk-table">
    {cats.length>1&&<div className="mk-chips" role="group" aria-label="품목">
      <button type="button" className={cat==='all'?'mk-chip on':'mk-chip'} onClick={()=>{setCat('all');reset();}}>전체 <small>{n(rows.length)}</small></button>
      {cats.map(c=><button type="button" key={c} className={cat===c?'mk-chip on':'mk-chip'} aria-pressed={cat===c} onClick={()=>{setCat(c);reset();}}>{CATS[c].icon} {CATS[c].label} <small>{n(counts[c])}</small></button>)}</div>}
    <div className="mk-chips" role="group" aria-label="조건">
      <button type="button" className={digital?'mk-chip on':'mk-chip'} aria-pressed={digital} onClick={()=>{setDigital(!digital);reset();}}>📱 디지털(모바일·카드) 되는 곳</button>
      {newCount>0&&<button type="button" className={fresh?'mk-chip on':'mk-chip'} aria-pressed={fresh} onClick={()=>{setFresh(!fresh);reset();}}>🆕 {latest}년 새로 가맹 <small>{n(newCount)}</small></button>}
    </div>
    {!list.length?<p className="muted">조건에 맞는 가게가 없어요.</p>
      :<ul className="mk-stores">{list.slice(0,more).map(r=><li key={r.id}><a href={storePath(r.id)}><b>{r.name}</b>
        <small>{CATS[r.cat].icon} {r.item??CATS[r.cat].label}{r.m?` · ${r.m}`:''}{r.d?'':' · 지류만'}</small></a></li>)}</ul>}
    {list.length>more&&<button type="button" className="mk-more" onClick={()=>setMore(x=>x+limit)}>더 보기 ({n(list.length-more)}곳 남음)</button>}
  </div>;
}
