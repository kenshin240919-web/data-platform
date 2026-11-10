'use client';
// 3초 답: '내 동네(시군구) 다이소에 그 상품 있어?' — 상품 후보(검색어) → 고른 상품의 매장별 재고(시군구 이름으로 조회).
// 서버(우리 Worker → 공개 중계)로는 검색어와 시군구 이름만 보냄. 거리 계산·가까운 순 정렬은 휴대폰 안에서.
import {useEffect,useMemo,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,here,nearest} from '@guidejung/ui/geo';
import {distKm,km,mapTo,n,openNow,telHref,won,type Product,type StockRes,type Store} from '../../lib/fmt';
export type Area={name:string;sido:string;lat:number;lon:number};

export function StockFinder({q:q0,label,areas,editable}:{q:string;label:string;areas:Area[];editable?:boolean}){
  const {pos,status,request}=useMyPosition();
  const [q,setQ]=useState(q0);const [input,setInput]=useState(q0);
  const [area,setArea]=useState('');const [manual,setManual]=useState(false);
  const [prods,setProds]=useState<Product[]|null|undefined>(undefined);const [pid,setPid]=useState('');
  const [res,setRes]=useState<StockRes|null|undefined>(undefined);const [more,setMore]=useState(8);
  // 내 위치에서 가까운 시군구 3곳(직접 고른 동네가 있으면 그 주소 속 시군구 먼저)
  const near3=useMemo(()=>{if(!pos)return [] as Area[];const h=here(pos);const first=nearest(areas,h.lat,h.lon,pos.pick);
    return [first,...areas.filter(a=>a!==first).sort((a,b)=>distKm(h.lat,h.lon,a.lat,a.lon)-distKm(h.lat,h.lon,b.lat,b.lon)).slice(0,2)];},[pos,areas]);
  useEffect(()=>{if(!manual&&near3[0])setArea(near3[0].name);},[near3,manual]);
  useEffect(()=>{let live=true;setProds(undefined);setPid('');
    fetch('/api/products?q='+encodeURIComponent(q)).then(r=>r.ok?r.json():Promise.reject()).then((d:{items:Product[]})=>{if(!live)return;setProds(d.items);if(d.items[0])setPid(d.items[0].id);}).catch(()=>{if(live)setProds(null);});
    return ()=>{live=false;};},[q]);
  useEffect(()=>{if(!pid||!area)return;let live=true;setRes(undefined);setMore(8);
    fetch(`/api/stock?id=${pid}&area=${encodeURIComponent(area)}`).then(r=>r.ok?r.json():Promise.reject()).then((d:StockRes)=>{if(live)setRes(d);}).catch(()=>{if(live)setRes(null);});
    return ()=>{live=false;};},[pid,area]);
  const center=pos?here(pos):areas.find(a=>a.name===area);
  const stores=useMemo(()=>{if(!res)return [] as (Store&{d:number|null})[];
    return res.stores.map(s=>({...s,d:center?distKm(center.lat,center.lon,s.lat,s.lon):null})).sort((a,b)=>(a.d??0)-(b.d??0));},[res,center]);
  const withStock=stores.filter(s=>(s.qty??0)>0);const first=withStock[0];
  const prod=prods?.find(p=>p.id===pid);
  const opts=near3.length?near3:[];
  return <section className="sk-near">
    {editable&&<form className="sk-search" role="search" onSubmit={e=>{e.preventDefault();const v=input.trim();if(v)setQ(v);}}>
      <input value={input} onChange={e=>setInput(e.target.value)} placeholder="찾는 물건 (예: 핫팩, 건전지, 우산)" aria-label="찾는 물건"/><button type="submit">찾기</button></form>}
    <PosNote/>{!pos?.precise&&<LocateCard title={`내 동네 다이소 ${label} 재고 보기`} desc="가까운 매장부터, 수량과 함께" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    <div className="sk-area"><span>📍 동네</span>
      {opts.map(a=><button type="button" key={a.name} className={area===a.name?'sk-chip on':'sk-chip'} onClick={()=>{setManual(true);setArea(a.name);}}>{a.name}</button>)}
      <select aria-label="다른 동네 고르기" value={opts.some(a=>a.name===area)?'':area} onChange={e=>{if(e.target.value){setManual(true);setArea(e.target.value);}}}>
        <option value="">다른 시군구…</option>{areas.map(a=><option key={a.sido+a.name} value={a.name}>{a.sido} {a.name}</option>)}</select></div>
    {prods===null&&<p className="sk-answer">지금 상품 정보를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>}
    {prods&&!prods.length&&<p className="sk-answer">‘{q}’로 찾은 상품이 없어요. 다른 말로 찾아보세요.</p>}
    {prods&&prods.length>0&&<div className="sk-chips" role="group" aria-label="상품 고르기">{prods.slice(0,10).map(p=><button type="button" key={p.id} className={p.id===pid?'sk-chip on':'sk-chip'} aria-pressed={p.id===pid} onClick={()=>setPid(p.id)}>{p.name}{p.price!=null&&<small> {won(p.price)}</small>}</button>)}</div>}
    {!area&&prods&&prods.length>0&&<p className="sk-answer muted">동네를 고르면 매장별 재고를 보여 드려요.</p>}
    {area&&pid&&res===undefined&&<p className="sk-answer muted">{area} 매장 재고 확인 중…</p>}
    {res===null&&<p className="sk-answer">지금 재고를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>}
    {res&&<>
      <p className="sk-answer">{res.total?<>📍 <b>{area}</b> 다이소 {n(res.total)}곳 중 <b>{n(res.inStock)}곳</b>에 있어요{first&&<> — 가장 가까운 <b>{first.name}</b>{first.d!=null&&` ${km(first.d)}`} · {n(first.qty!)}개</>}{res.unknown>0&&<small className="muted"> (수량 확인 필요 {res.unknown}곳)</small>}</>
        :<>📍 {area}에서 찾은 다이소 매장이 없어요. 옆 동네를 골라 보세요.</>}</p>
      {prod&&<p className="muted small">{prod.name}{prod.price!=null&&` · ${won(prod.price)}`}{res.online!=null&&` · 온라인 재고 ${n(res.online)}개`}</p>}
      <div className="sk-cards">{stores.slice(0,more).map(s=>{const o=openNow(s);return <details className="sk-card" key={s.code}>
        <summary><span className="sk-icon" aria-hidden="true">{(s.qty??0)>0?'✅':s.qty===0?'⛔':'❔'}</span><span className="sk-card-body"><b>{s.name}</b>
          <small>{s.d!=null&&<span className="sk-km">{km(s.d)}</span>}<span className={(s.qty??0)>0?'sk-qty in':s.qty===0?'sk-qty out':'sk-qty'}>{(s.qty??0)>0?`${n(s.qty!)}개 있음`:s.qty===0?'없음':'수량 확인 필요'}</span>{o!=null&&<span className={o?'sk-open':'sk-closed'}>{o?'영업 중':'영업 끝'}</span>}</small></span></summary>
        <div className="sk-detail"><p>{s.addr}</p><p>{s.open&&s.close&&`영업 ${s.open}~${s.close}`}{s.parking&&' · 주차'}{s.pickup&&' · 매장 픽업'}</p>
          <p className="sk-acts"><a href={mapTo(s.name,s.lat,s.lon)} target="_blank" rel="noopener">🧭 길찾기</a>{s.tel&&<a href={telHref(s.tel)}>📞 {s.tel}</a>}</p></div>
      </details>;})}</div>
      {stores.length>more&&<button type="button" className="sk-more" onClick={()=>setMore(x=>x+8)}>더 보기 ({n(stores.length-more)}곳 남음)</button>}
      <p className="muted small">다이소몰에 공개된 매장 재고를 공개 중계로 받아 보여 드리는 비공식 안내예요(5분마다 새로 확인, 저장하지 않음). 실제 매장 재고와 다를 수 있으니 급하면 매장에 전화로 확인하세요.</p>
    </>}
  </section>;
}
