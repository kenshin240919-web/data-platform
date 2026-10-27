'use client';
// 메인 3초 답: 내 위치(이미 허용 → 정확, 아니면 접속 위치) 주변 종류별 수와 가장 가까운 찜질방(또는 고른 종류).
// /api/near?per= 는 종류마다 가까운 곳을 per개씩 + 종류별 전체 수(counts) — 피부관리실이 많아 다른 종류가 묻히지 않게.
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow} from '@guidejung/ui/geo';
import {KIND_ORDER,KINDS,km,n,shopPath,type Kind,type Slim} from '../../lib/fmt';
import {PlaceList} from './PlaceList';
type Res={counts:Record<Kind,number>;items:Slim[]};
export function NearRest({kind}:{kind?:Kind}){
  const {pos,status,request}=useMyPosition();
  const [res,setRes]=useState<Res|null>(null);const [radius,setRadius]=useState(0);
  const main=kind??'sauna';
  useEffect(()=>{if(!pos)return;let live=true;
    const steps=kind==='private'||kind==='anma'?(pos.precise?[2,5,10,30]:[5,10,30,50]):pos.precise?[1,2,5,10]:[3,6,10,20];  // 1인·안마원은 드물어 넓게
    const load=(i:number):Promise<void>=>fetch(`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${steps[i]}&per=${kind?60:15}${kind?`&kind=${kind}`:''}`).then(x=>x.json()).then(fixKmNow).then((d:Res):Promise<void>|void=>{if(!live)return;
      if((d.counts[main]??0)<(kind?3:2)&&i<steps.length-1)return load(i+1);setRes(d);setRadius(steps[i]);});
    load(0).catch(()=>{if(live)setRes({counts:{} as Res['counts'],items:[]});});return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const first=res?.items.find(p=>p.kind===main);
  const shown=KIND_ORDER.filter(k=>(!kind||k===kind)&&(res?.counts[k]??0)>0);
  return <section className="rs-near">
    <PosNote/>{!pos?.precise&&<LocateCard title={`내 위치 주변 ${kind?KINDS[kind].label:'찜질방·목욕탕'} 보기`} desc="가까운 순으로 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!res&&<p className="rs-answer muted">내 주변 찾는 중…</p>}
    {res&&<>
      <p className="rs-answer">{shown.length?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 {shown.map((k,i)=><span key={k}>{i>0&&' · '}{KINDS[k].label} <b>{n(res.counts[k])}곳</b></span>)}
        {first&&<>{' '}— 가장 가까운 {KINDS[main].label} <a href={shopPath(first.id)}><b>{first.name}</b></a> {first.km!=null&&km(first.km)}</>}</>
        :<>📍 {radius}km 안에 신고된 곳이 없어요. 지역 목록에서 찾아보세요.</>}</p>
      {res.items.length>0&&<PlaceList items={res.items} limit={12} kind={kind}/>}
    </>}
  </section>;
}
