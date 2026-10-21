'use client';
// 메인 3초 답: 내 위치(이미 허용 → 정확, 아니면 접속 위치) 주변 휘발유·경유 가장 싼 주유소.
import {useEffect,useState} from 'react';
import {LocateCard,useMyPosition} from '@guidejung/ui/geo';
import {km,PROD_LABEL,stationPath,tank,won,type Prod} from '../../lib/fmt';
import {StationList,type Item} from './StationList';
export function NearCheap({avg}:{avg:Record<Prod,number|null>}){
  const {pos,status,request}=useMyPosition();
  const [prod,setProd]=useState<Prod>('B027');const [items,setItems]=useState<Item[]|null>(null);const [radius,setRadius]=useState(0);
  useEffect(()=>{if(!pos)return;let live=true;setItems(null);
    // 가까운 곳에 없으면 반경을 넓혀 다시(최저가 목록에 든 주유소만 있음 — 경유는 시도별 20곳뿐이라 40km까지).
    const load=(k:number):Promise<void>=>fetch(`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${k}&prod=${prod}&limit=12`).then(x=>x.json()).then((d:{items:Item[]}):Promise<void>|void=>{if(!live)return;
      if(d.items.length<3&&k<(prod==='D047'?40:20))return load(k*2);setItems(d.items);setRadius(k);});
    load(pos.precise?3:5).catch(()=>{if(live)setItems([]);});return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,prod]); // eslint-disable-line react-hooks/exhaustive-deps
  const best=items?.length?[...items].sort((a,b)=>(a.prices[prod]??9e9)-(b.prices[prod]??9e9))[0]:null;const bp=best?.prices[prod];const a=avg[prod];
  return <section className="oi-near">
    <div className="oi-chips" role="group" aria-label="연료">{(['B027','D047'] as Prod[]).map(p=><button key={p} type="button" className={prod===p?'oi-chip on':'oi-chip'} aria-pressed={prod===p} onClick={()=>setProd(p)}>{PROD_LABEL[p]}</button>)}</div>
    {!pos?.precise&&<LocateCard title="내 주변 싼 주유소 보기" desc="가까운 최저가 주유소를 가격·거리로 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!items&&<p className="oi-answer muted">내 주변 주유소 찾는 중…</p>}
    {items&&<>
      <p className="oi-answer">{best&&bp?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 {PROD_LABEL[prod]} 가장 싼 곳 <a href={stationPath(best.id)}><b>{best.name} {won(bp)}</b></a>{best.km!=null&&<> · {km(best.km)}</>}{a&&bp<a?<> — 전국 평균보다 <b>{won(a-bp)}</b> 싸요(60L 가득 {won(tank(a-bp))} 절약)</>:null}</>
        :<>📍 {radius}km 안에서 최저가 주유소를 찾지 못했어요. 아래 지역별 목록을 보세요.</>}</p>
      {prod==='D047'&&<p className="muted small">경유는 시도마다 가장 싼 20곳만 모아 가까운 곳이 적을 수 있어요.</p>}
      <StationList items={[...items].sort((x,y)=>(x.km??0)-(y.km??0))} prod={prod} avg={a} avgLabel="전국 평균" rank={false}/>
    </>}
  </section>;
}
