'use client';
// 첫 화면 탭: 다이소 | 올리브영 — 고른 탭은 이 브라우저에 기억(gj.stock.tab).
import {useEffect,useState} from 'react';
import {StockFinder,type Area} from './StockFinder';
import {OliveFinder} from './OliveFinder';
type T={q:string;name:string};
type Tab='daiso'|'olive';
export function HomeTabs({daiso,olive,areas}:{daiso:T;olive:T;areas:Area[]}){
  const [tab,setTab]=useState<Tab>('daiso');
  useEffect(()=>{try{if(localStorage.getItem('gj.stock.tab')==='olive')setTab('olive');}catch{/* 저장소 없음 */}},[]);
  const go=(t:Tab)=>{setTab(t);try{localStorage.setItem('gj.stock.tab',t);}catch{/* 저장소 없음 */}};
  return <>
    <div className="sk-tabs" role="tablist" aria-label="매장 고르기">
      <button type="button" role="tab" aria-selected={tab==='daiso'} className={tab==='daiso'?'on':''} onClick={()=>go('daiso')}>🧺 다이소</button>
      <button type="button" role="tab" aria-selected={tab==='olive'} className={tab==='olive'?'on':''} onClick={()=>go('olive')}>💄 올리브영</button></div>
    {tab==='daiso'?<StockFinder q={daiso.q} label={daiso.name} areas={areas} editable/>:<OliveFinder q={olive.q} label={olive.name} areas={areas} editable/>}
  </>;
}
