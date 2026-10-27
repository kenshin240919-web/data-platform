'use client';
// 학교 고르기: 이름 검색(Worker /api/search) + 내 주변 학교(위치를 알면). 카드를 누르면 학교 페이지, ☆로 '내 학교' 저장.
import {useEffect,useState} from 'react';
import {LocateCard,useMyPosition,fixKmNow} from '@guidejung/ui/geo';
import {KIND_ICON,KIND_LABEL,schoolPath,type Card} from '../../lib/fmt';
import {setMine,useMine} from './mine';

function useSearch(params:string|null){
  const [res,setRes]=useState<{total:number;items:Card[]}|null>(null);const [busy,setBusy]=useState(false);
  useEffect(()=>{if(!params){setRes(null);return;}let live=true;setBusy(true);
    const t=setTimeout(()=>fetch('/api/search?'+params).then(r=>r.ok?r.json():Promise.reject()).then(fixKmNow).then(d=>{if(live)setRes(d);}).catch(()=>{if(live)setRes({total:0,items:[]});}).finally(()=>{if(live)setBusy(false);}),250);
    return ()=>{live=false;clearTimeout(t);};},[params]);
  return {res,busy};
}
export function SchoolCard({c}:{c:Card}){
  const mine=useMine();const on=mine?.code===c.code;
  return <div className="sc-card-wrap">
    <a className="sc-card" href={schoolPath(c.code)}><span className="sc-card-icon" aria-hidden="true">{KIND_ICON[c.k]??'🏫'}</span>
      <span className="sc-card-body"><b>{c.name}</b><small className="muted">{c.km!=null?`📍 ${c.km<1?`${Math.round(c.km*1000)}m`:`${c.km.toFixed(1)}km`} · `:''}{c.region_name}</small></span></a>
    <button type="button" className={on?'sc-star on':'sc-star'} aria-pressed={on} title={on?'내 학교에서 빼기':'내 학교로 저장'}
      onClick={()=>setMine(on?null:{code:c.code,name:c.name,kind:c.kind,k:c.k})}>{on?'⭐ 내 학교':'☆ 내 학교로'}</button>
  </div>;
}
const KINDS=['elem','middle','high'];
export function SchoolPicker({initialQ='',near=true}:{initialQ?:string;near?:boolean}){
  const [q,setQ]=useState(initialQ);const [k,setK]=useState('');
  const {pos,status,request}=useMyPosition();
  const qs=q.trim()?new URLSearchParams({q:q.trim(),...(k?{k}:{})}).toString():null;
  const ns=near&&!q.trim()&&pos?new URLSearchParams({lat:pos.lat.toFixed(4),lon:pos.lon.toFixed(4),km:pos.precise?'2':'5',limit:'12',...(k?{k}:{})}).toString():null;
  const found=useSearch(qs),nearby=useSearch(ns);
  const list=qs?found:nearby;
  return <div className="sc-picker">
    <form role="search" className="sc-search" onSubmit={e=>e.preventDefault()}>
      <input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="학교 이름 (예: 대치중, 서울 상암고)" aria-label="학교 이름 검색" autoComplete="off"/>
    </form>
    <div className="sc-chips" role="group" aria-label="학교 종류">{[['','전체'],...KINDS.map(x=>[x,KIND_LABEL[x]])].map(([v,l])=><button type="button" key={v} className={k===v?'sc-chip on':'sc-chip'} aria-pressed={k===v} onClick={()=>setK(v)}>{l}</button>)}</div>
    {!qs&&near&&!pos?.precise&&<LocateCard title="내 주변 학교에서 고르기" desc="가까운 학교를 먼저 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {(qs||ns)&&<>
      <h2 className="sc-list-title">{qs?`‘${q.trim()}’ 검색 결과`:pos?.precise?'📍 내 주변 2km 학교':'📍 접속 위치 주변 학교'}{list.res&&<span className="muted"> {list.res.total.toLocaleString('ko-KR')}곳</span>}</h2>
      {list.busy&&!list.res?<p className="muted">찾는 중…</p>:list.res&&!list.res.items.length?<p className="muted">{qs?'이름이 맞는 학교가 없어요. 학교 이름 앞부분만 넣어 보세요(예: 대치중).':'주변에서 학교를 찾지 못했어요. 이름으로 찾아보세요.'}</p>:
        <div className="sc-cards">{list.res?.items.map(c=><SchoolCard key={c.code} c={c}/>)}</div>}
    </>}
  </div>;
}
