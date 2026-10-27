'use client';
// 내 주변 무인 프린트점·프린트카페: Worker /api/print 가 카카오·네이버(NAVER API HUB)에서 방문 때마다 실시간으로 찾음(저장 안 함).
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow} from '@guidejung/ui/geo';
import {km,n,telHref} from '../../lib/fmt';
type Shop={name:string;addr:string|null;lat:number;lon:number;tel:string|null;cat:string;url:string|null;src:string[];km:number};
export function PrintNear({compact=false}:{compact?:boolean}){
  const {pos,status,request}=useMyPosition();
  const [items,setItems]=useState<Shop[]|null>(null);
  useEffect(()=>{if(!pos)return;let live=true;setItems(null);
    fetch(`/api/print?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}`).then(x=>x.json()).then(fixKmNow).then((d:{items?:Shop[]})=>{if(live)setItems(d.items??[]);}).catch(()=>{if(live)setItems([]);});
    return ()=>{live=false;};},[pos?.lat,pos?.lon]);
  const list=(items??[]).slice(0,compact?4:20);
  return <section className="cv-print">
    <h2>📄 내 주변 무인 프린트·프린트카페</h2>
    <PosNote/>{!pos?.precise&&<LocateCard title="내 주변 무인 프린트 찾기" desc="정부24에서 받은 서류를 바로 뽑을 곳" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!items&&<p className="muted">찾는 중…</p>}
    {items&&!items.length&&<p className="muted">5km 안에서 찾지 못했어요. 가까운 편의점·주민센터 복사기도 확인해 보세요.</p>}
    {list.length>0&&<><p className="cv-answer">5km 안 <b>{n(items!.length)}곳</b> · 가장 가까운 곳 <b>{list[0].name}</b> {km(list[0].km)}</p>
      <div className="cv-cards">{list.map(s=><div key={s.name+s.lat} className="cv-card"><a className="cv-card-main" data-gj-pt={`${s.lat},${s.lon}`} data-gj-name={s.name} href={s.url??`https://map.kakao.com/link/map/${encodeURIComponent(s.name)},${s.lat},${s.lon}`} target="_blank" rel="noopener">
        <span className="cv-kind" aria-hidden="true">📄</span><span className="cv-card-body"><b>{s.name}</b><small><span className="cv-km">{km(s.km)}</span>{s.cat&&<span className="cv-tag">{s.cat}</span>}</small><small className="muted">{s.addr}</small></span></a>
        <span className="cv-acts">{s.tel&&<a href={telHref(s.tel)} aria-label={`${s.name} 전화`}>📞</a>}<a href={`https://map.naver.com/p/search/${encodeURIComponent(s.name+' '+(s.addr??'').split(' ').slice(1,3).join(' '))}`} target="_blank" rel="noopener" aria-label={`${s.name} 네이버 지도`}>🟢</a></span></div>)}</div>
      <p className="muted small">카카오맵·네이버 지역 검색 결과를 실시간으로 보여 드려요(저장하지 않아요). 운영 시간·가격은 매장에 확인하세요.</p></>}
  </section>;
}
