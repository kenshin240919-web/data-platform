'use client';
// 메인 3초 답: 내 위치(이미 허용 → 정확, 아니면 접속 위치) 주변 정비소·검사소·세차장 수와 가장 가까운 곳.
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow,padKm,within} from '@guidejung/ui/geo';
import {centerPath,KINDS,km,n,type Kind,type Slim} from '../../lib/fmt';
import {CenterList} from './CenterList';
export function NearCenter({kind}:{kind?:Kind}){
  const {pos,status,request}=useMyPosition();
  const [items,setItems]=useState<Slim[]|null>(null);const [radius,setRadius]=useState(0);
  useEffect(()=>{if(!pos)return;let live=true;
    const steps=pos.precise?[1,2,5,10]:[3,6,10,20];
    const load=(i:number):Promise<void>=>fetch(`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${padKm(steps[i])}&limit=100${kind?`&kind=${kind}`:''}`).then(x=>x.json()).then(fixKmNow).then(within(steps[i])).then((d:{items:Slim[]}):Promise<void>|void=>{if(!live)return;
      if(d.items.filter(p=>p.kind==='repair'||kind).length<3&&i<steps.length-1)return load(i+1);setItems(d.items);setRadius(steps[i]);});
    load(0).catch(()=>{if(live)setItems([]);});return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const count=(k:Kind)=>items?.filter(p=>p.kind===k).length??0;
  const main=kind??'repair',first=items?.find(p=>p.kind===main);
  return <section className="sv-near">
    <PosNote/>{!pos?.precise&&<LocateCard title={`내 위치 주변 ${kind?KINDS[kind].label:'정비소·검사소'} 보기`} desc="가까운 순으로 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!items&&<p className="sv-answer muted">내 주변 찾는 중…</p>}
    {items&&<>
      <p className="sv-answer">{first?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 {kind?<>{KINDS[kind].label} <b>{n(count(kind))}곳</b></>:<>정비소 <b>{n(count('repair'))}곳</b> · 검사소 {n(count('inspect'))}곳 · 세차장 {n(count('wash'))}곳</>}
        {' '}— 가장 가까운 {KINDS[main].label} <a href={centerPath(first.id)}><b>{first.name}</b></a> {first.km!=null&&km(first.km)}{first.sub&&` (${first.sub})`}</>
        :<>📍 {radius}km 안에 등록된 곳이 없어요. 지역 목록에서 찾아보세요.</>}</p>
      {first&&<CenterList items={items} limit={12} kind={kind}/>}
    </>}
  </section>;
}
