'use client';
// 내 주변 브랜드 서비스센터: 방문자 위치로 그때그때 카카오 로컬 검색(Worker /api/brand-near) — 결과는 저장하지 않음(카카오 API 조건).
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow} from '@guidejung/ui/geo';
import {km} from '../../lib/fmt';
type Place={name:string;addr:string|null;tel:string|null;km:number;url:string};
export function BrandNear({slug,name,fallback}:{slug:string;name:string;fallback:string}){
  const {pos,status,request}=useMyPosition();
  const [res,setRes]=useState<{items:Place[]}|null|'error'>(null);
  useEffect(()=>{if(!pos)return;let live=true;setRes(null);
    fetch(`/api/brand-near?brand=${slug}&lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}`).then(r=>r.ok?r.json():Promise.reject()).then(fixKmNow).then(d=>{if(live)setRes(d);}).catch(()=>{if(live)setRes('error');});
    return ()=>{live=false;};},[pos?.lat,pos?.lon,slug]);
  const first=res&&res!=='error'?res.items[0]:undefined;
  return <section className="sv-near"><h2>📍 내 주변 {name} 센터</h2>
    <PosNote/>{!pos?.precise&&<LocateCard title={`내 위치에서 가까운 ${name} 센터 찾기`} desc="가까운 순으로 위치·전화번호를 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&res===null&&<p className="sv-answer muted">가까운 센터 찾는 중…</p>}
    {res==='error'&&<p className="sv-note">지금은 가까운 센터를 불러오지 못했어요. <a href={fallback} rel="noopener" target="_blank">공식 센터 찾기 ↗</a>에서 확인하세요.</p>}
    {res&&res!=='error'&&<>
      <p className="sv-answer">{first?<>📍 {pos?.precise?'내 위치':'접속 위치'}에서 가장 가까운 곳 <b>{first.name}</b> {km(first.km)}{res.items.length>1?<> · 20km 안 {res.items.length}곳</>:null}</>:<>20km 안에서 찾지 못했어요. <a href={fallback} rel="noopener" target="_blank">공식 센터 찾기 ↗</a></>}</p>
      <div className="sv-cards">{res.items.map(p=><div key={p.url} className="sv-card">
        <a className="sv-card-body" href={p.url} rel="noopener" target="_blank"><b>{p.name}</b><small>{km(p.km)}{p.addr?` · ${p.addr}`:''}</small><small className="muted">카카오맵에서 보기 ↗</small></a>
        {p.tel&&<a className="sv-tel" href={`tel:${p.tel.replace(/[^0-9]/g,'')}`} aria-label={`${p.name} 전화`}>📞</a>}</div>)}</div>
      <p className="muted small">위치 정보: 카카오 로컬 검색(방문할 때마다 실시간으로 찾아요). 운영 시간은 센터마다 다르니 전화나 공식 누리집으로 확인하세요.</p>
    </>}
  </section>;
}
