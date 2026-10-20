'use client';
import {useEffect,useState} from 'react';
import {LocateCard,useMyPosition} from '@guidejung/ui/geo';
import {hospitalPath,km,type Card} from '../../lib/fmt';
type Er=Card&{beds:number|null;updated:string|null;er_tel?:string|null};
export function ErList(){
  const {pos,status,request}=useMyPosition();const [er,setEr]=useState<Er[]|null>(null);
  useEffect(()=>{if(!pos)return;let live=true;fetch(`/api/er?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&limit=12`).then(x=>x.json()).then(d=>{if(live)setEr(d.items);}).catch(()=>{if(live)setEr([]);});return ()=>{live=false;};},[pos?.lat,pos?.lon]);
  return <section>
    {!pos?.precise&&<LocateCard title="내 위치 주변 응급실 보기" desc="가까운 순으로 응급실과 실시간 남은 병상을 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!er&&<p className="muted">가까운 응급실 찾는 중…</p>}
    {er&&<div className="hp-er-list">{er.map(e=><div key={e.id} className="hp-er-card"><a href={hospitalPath(e.id)}><b>{e.name}</b></a><span>{e.km!=null&&km(e.km)}{e.beds!=null?<> · 응급실 남은 병상 <strong>{e.beds}</strong></>:' · 병상 정보 없음'}</span>{e.updated&&<small className="muted">{e.updated} 기준</small>}{(e.er_tel||e.tel)&&<a className="hp-tel-text" href={`tel:${(e.er_tel||e.tel)!.replace(/[^0-9]/g,'')}`}>📞 응급실 전화</a>}</div>)}</div>}
  </section>;
}
