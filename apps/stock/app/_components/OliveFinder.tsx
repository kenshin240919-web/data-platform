'use client';
// 올리브영 3초 답: '내 주변 올리브영에 그거 있어?' — 검색어로 찾은 위쪽 상품 3개의 주변 매장별 재고(공개 중계, 비공식).
// 서버엔 약 2km 칸 중심 좌표(위치 허용 시) 또는 고른 시군구 중심점과 검색어만 보냄. 거리·정렬은 휴대폰 안에서.
import {useEffect,useMemo,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,here} from '@guidejung/ui/geo';
import {distKm,km,mapTo,n,won,type OyRes} from '../../lib/fmt';
import type {Area} from './StockFinder';

const ICON={in:'✅',out:'⛔',none:'➖',unknown:'❔'} as const;
export function OliveFinder({q:q0,label,areas,editable}:{q:string;label:string;areas:Area[];editable?:boolean}){
  const {pos,status,request}=useMyPosition();
  const [q,setQ]=useState(q0);const [input,setInput]=useState(q0);const [area,setArea]=useState('');
  const [res,setRes]=useState<OyRes|null|undefined>(undefined);const [pi,setPi]=useState(0);const [more,setMore]=useState(8);const [slow,setSlow]=useState(false);
  const picked=areas.find(a=>a.name===area);
  // 직접 고른 시군구가 있으면 그 중심, 아니면 내 위치(칸 중심)
  const ask=picked?{lat:picked.lat,lon:picked.lon}:pos?{lat:pos.lat,lon:pos.lon}:null;
  useEffect(()=>{if(!ask)return;let live=true;setRes(undefined);setPi(0);setMore(8);setSlow(false);
    const t=setTimeout(()=>live&&setSlow(true),6000);
    fetch(`/api/oy?q=${encodeURIComponent(q)}&lat=${ask.lat.toFixed(4)}&lon=${ask.lon.toFixed(4)}`).then(r=>r.ok?r.json():Promise.reject()).then((d:OyRes)=>{if(live)setRes(d);}).catch(()=>{if(live)setRes(null);}).finally(()=>clearTimeout(t));
    return ()=>{live=false;clearTimeout(t);};},[q,ask?.lat,ask?.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  const from=picked?{lat:picked.lat,lon:picked.lon}:pos?here(pos):null;
  const prods=useMemo(()=>(res?.products??[]).filter(p=>p.checked),[res]);
  const prod=prods[pi];
  const stores=useMemo(()=>!prod?[]:prod.stores.filter(s=>s.status!=='none').map(s=>({...s,d:from?distKm(from.lat,from.lon,s.lat,s.lon):null}))
    .sort((a,b)=>(a.status==='in'?0:1)-(b.status==='in'?0:1)||(a.d??0)-(b.d??0)),[prod,from?.lat,from?.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  const inStore=stores.filter(s=>s.status==='in').sort((a,b)=>(a.d??0)-(b.d??0));const first=inStore[0];
  const notSold=prod?prod.stores.filter(s=>s.status==='none').length:0;
  const where=picked?picked.name:pos?.precise?'내 주변':'접속 위치 주변';
  return <section className="sk-near">
    {editable&&<form className="sk-search" role="search" onSubmit={e=>{e.preventDefault();const v=input.trim();if(v)setQ(v);}}>
      <input value={input} onChange={e=>setInput(e.target.value)} placeholder="찾는 상품 (예: 핸드크림, 립밤, 선크림)" aria-label="찾는 상품"/><button type="submit">찾기</button></form>}
    <PosNote/>{!pos?.precise&&!picked&&<LocateCard title={`내 주변 올리브영 ${label} 재고 보기`} desc="가까운 매장부터, 수량과 함께" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    <div className="sk-area"><span>📍 기준</span>
      <button type="button" className={!picked?'sk-chip on':'sk-chip'} onClick={()=>setArea('')}>{pos?.precise?'내 위치':'접속 위치'}</button>
      <select aria-label="다른 동네 고르기" value={area} onChange={e=>setArea(e.target.value)}>
        <option value="">다른 시군구…</option>{areas.map(a=><option key={a.sido+a.name} value={a.name}>{a.sido} {a.name}</option>)}</select></div>
    {!ask&&<p className="sk-answer muted">위치를 허용하거나 시군구를 고르면 가까운 올리브영 재고를 보여 드려요.</p>}
    {ask&&res===undefined&&<p className="sk-answer muted">{where} 올리브영 ‘{q}’ 재고 확인 중…{slow&&<><br/><small>처음 찾는 동네·상품은 30초 넘게 걸릴 수 있어요. 한 번 찾은 건 10분 동안 바로 나와요.</small></>}</p>}
    {res===null&&<p className="sk-answer">지금 올리브영 재고를 불러오지 못했어요. 잠시 뒤 다시 시도하거나 올리브영 앱에서 확인해 주세요.</p>}
    {res&&!prods.length&&<p className="sk-answer">‘{q}’로 찾은 올리브영 상품이 없거나 주변 매장 재고를 확인하지 못했어요. 다른 말로 찾아보세요.</p>}
    {prod&&<>
      {prods.length>1&&<div className="sk-chips" role="group" aria-label="상품 고르기">{prods.map((p,i)=><button type="button" key={p.id} className={i===pi?'sk-chip on':'sk-chip'} aria-pressed={i===pi} onClick={()=>{setPi(i);setMore(8);}}>{p.name.replace(/^\[[^\]]*\]\s*/,'').slice(0,34)}{p.price!=null&&<small> {won(p.price)}</small>}</button>)}</div>}
      <p className="sk-answer">📍 {where} 올리브영 {n(stores.length)}곳 중 <b>{n(inStore.length)}곳</b>에 있어요{first&&<> — 가장 가까운 <b>{first.name}</b>{first.d!=null&&` ${km(first.d)}`} · {first.label}</>}</p>
      <p className="muted small">{prod.name}{prod.price!=null&&` · ${won(prod.price)}`}{prod.rate?` (${prod.rate}% 할인가)`:''}{notSold>0&&` · 이 상품을 팔지 않는 매장 ${n(notSold)}곳은 뺐어요`}</p>
      <div className="sk-cards">{stores.slice(0,more).map(s=><details className="sk-card" key={s.code}>
        <summary><span className="sk-icon" aria-hidden="true">{ICON[s.status]}</span><span className="sk-card-body"><b>{s.name}</b>
          <small>{s.d!=null&&<span className="sk-km">{km(s.d)}</span>}<span className={s.status==='in'?'sk-qty in':s.status==='out'?'sk-qty out':'sk-qty'}>{s.label||(s.status==='out'?'품절':'수량 확인 필요')}</span>{s.open!=null&&<span className={s.open?'sk-open':'sk-closed'}>{s.open?'영업 중':'영업 전·후'}</span>}</small></span></summary>
        <div className="sk-detail"><p>{s.addr}</p>{s.pickup&&<p>오늘드림·매장 픽업 가능 매장</p>}
          <p className="sk-acts"><a href={mapTo(s.name.startsWith('올리브')?s.name:`올리브영 ${s.name}`,s.lat,s.lon)} target="_blank" rel="noopener">🧭 길찾기</a></p></div>
      </details>)}</div>
      {stores.length>more&&<button type="button" className="sk-more" onClick={()=>setMore(x=>x+8)}>더 보기 ({n(stores.length-more)}곳 남음)</button>}
      <p className="muted small">올리브영 앱에 공개된 매장 재고를 공개 중계로 받아 보여 드리는 비공식 안내예요(10분마다 새로 확인, 저장하지 않음). 실제 매장 재고와 다를 수 있어요.</p>
    </>}
  </section>;
}
