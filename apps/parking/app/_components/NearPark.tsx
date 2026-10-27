'use client';
// 메인 3초 답: 내 위치(이미 허용 → 정확, 아니면 접속 위치) 주변 공영·무료 주차장 수와 가장 싼·가까운 곳.
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow,padKm,within} from '@guidejung/ui/geo';
import {feeFor,km,lotPath,n,type Slim} from '../../lib/fmt';
import {LotList} from './LotList';
export function NearPark(){
  const {pos,status,request}=useMyPosition();
  const [items,setItems]=useState<Slim[]|null>(null);const [radius,setRadius]=useState(0);
  useEffect(()=>{if(!pos)return;let live=true;
    // 가까이에 3곳이 안 되면 반경을 넓혀 다시(1 → 2 → 5km, 대략 위치는 3km부터).
    const steps=pos.precise?[1,2,5]:[3,6,10];
    const load=(i:number):Promise<void>=>fetch(`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${padKm(steps[i])}&limit=100`).then(x=>x.json()).then(fixKmNow).then(within(steps[i])).then((d:{items:Slim[]}):Promise<void>|void=>{if(!live)return;
      if(d.items.length<3&&i<steps.length-1)return load(i+1);setItems(d.items);setRadius(steps[i]);});
    load(0).catch(()=>{if(live)setItems([]);});return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise]); // eslint-disable-line react-hooks/exhaustive-deps
  const free=items?.filter(p=>p.charge==='무료')??[];
  const cheap=items?[...items].filter(p=>feeFor(p,60)!=null).sort((a,b)=>feeFor(a,60)!-feeFor(b,60)!||a.km!-b.km!)[0]:undefined;
  const first=items?.[0];
  return <section className="pk-near">
    <PosNote/>{!pos?.precise&&<LocateCard title="내 위치 주변 주차장 보기" desc="가까운 공영·무료 주차장과 예상 요금을 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!items&&<p className="pk-answer muted">내 주변 주차장 찾는 중…</p>}
    {items&&<>
      <p className="pk-answer">{first?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 공영 주차장 <b>{n(items.length)}곳</b>{items.length>=60?'+':''} · 무료 <b>{n(free.length)}곳</b>
        {cheap&&<> — 1시간 가장 싼 곳 <a href={lotPath(cheap.id)}><b>{cheap.name}</b></a> {km(cheap.km!)} · {feeFor(cheap,60)===0?'무료':`${n(feeFor(cheap,60)!)}원`}</>}</>
        :<>📍 {radius}km 안에 등록된 공영 주차장이 없어요. 지역 목록에서 찾아보세요.</>}</p>
      {first&&<LotList items={items} limit={12}/>}
    </>}
  </section>;
}
