'use client';
// 메인 3초 답: 내 위치(이미 허용 → 정확, 아니면 접속 위치) 주변 지금 문 연 약국 수와 가장 가까운 곳.
import {useEffect,useState} from 'react';
import {LocateCard,useMyPosition} from '@guidejung/ui/geo';
import {km,pharmacyPath,statusOf} from '../../lib/fmt';
import {StatusList,useNow,type Item} from './StatusList';
export function NearNow(){
  const {pos,status,request}=useMyPosition();const now=useNow();
  const [items,setItems]=useState<Item[]|null>(null);const [radius,setRadius]=useState(0);
  useEffect(()=>{if(!pos)return;let live=true;const r=pos.precise?2:5;
    // 가까운 곳에 지금 문 연 약국이 없으면 반경을 넓혀 다시(밤·휴일).
    const load=(k:number):Promise<void>=>fetch(`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${k}&limit=50`).then(x=>x.json()).then((d:{items:Item[]}):Promise<void>|void=>{if(!live)return;
      const open=d.items.filter(p=>statusOf(p).state!=='closed').length;if(!open&&k<10)return load(k*2);setItems(d.items);setRadius(k);});
    load(r).catch(()=>{if(live)setItems([]);});return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise]); // eslint-disable-line react-hooks/exhaustive-deps
  const open=items&&now?items.filter(p=>statusOf(p,now).state!=='closed'):[];
  const first=open[0];
  return <section className="ph-near">
    {!pos?.precise&&<LocateCard title="내 위치 주변 문 연 약국 보기" desc="가까운 순으로 지금 영업 중인 약국을 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!items&&<p className="ph-answer muted">내 주변 약국 찾는 중…</p>}
    {items&&now&&<>
      <p className={`ph-answer ${first?'open':'closed'}`}><span className="ph-dot" aria-hidden="true"></span>{first?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 <b>지금 문 연 약국 {open.length.toLocaleString('ko-KR')}곳</b> · 가장 가까운 곳 <a href={pharmacyPath(first.id)}><b>{first.name}</b></a> {first.km!=null&&km(first.km)} ({statusOf(first,now).label})</>
        :<>📍 {radius}km 안에 지금 문 연 약국이 없어요. 아래에서 여는 시간을 확인하세요.</>}</p>
      <StatusList items={items} initial={first?'open':'all'} sortOpen={false} limit={12}/>
    </>}
  </section>;
}
