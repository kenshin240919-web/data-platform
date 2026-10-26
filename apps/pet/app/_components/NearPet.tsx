'use client';
// 메인 3초 답: 내 위치(이미 허용 → 정확, 아니면 접속 위치) 주변 종류별 수·지금 문 연 동물약국 수와 가장 가까운 동물병원.
// 밤(21~9시)·일요일·공휴일에는 맨 위에 가장 가까운 24시 동물병원(이름 기준, 30km 안)을 먼저 보여 줌.
// /api/near?per= 는 종류마다 가까운 곳을 per개씩 + 종류별 전체 수(counts)·지금 문 연 동물약국 수(open).
import {useEffect,useState} from 'react';
import {LocateCard,useMyPosition} from '@guidejung/ui/geo';
import {KIND_ORDER,KINDS,km,n,offHours,placePath,telHref,type Kind,type Slim} from '../../lib/fmt';
import {PlaceList} from './PlaceList';
type Res={counts:Record<Kind,number>;open:number;items:Slim[]};
export function NearPet({kind}:{kind?:Kind}){
  const {pos,status,request}=useMyPosition();
  const [res,setRes]=useState<Res|null>(null);const [radius,setRadius]=useState(0);const [h24,setH24]=useState<Slim[]|null>(null);const [night,setNight]=useState(false);
  const main=kind??'hospital';
  useEffect(()=>{setNight(offHours());},[]);
  useEffect(()=>{if(!pos)return;let live=true;const ll=`lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}`;
    const rare=kind==='cafe'||kind==='taxi'||kind==='shelter';  // 카페·펫택시·보호센터는 드물어 넓게
    const steps=rare?(pos.precise?[3,10,30,50]:[10,30,50]):pos.precise?[2,5,10,20]:[5,10,20,30];
    const load=(i:number):Promise<void>=>fetch(`/api/near?${ll}&km=${steps[i]}&per=${kind?60:15}${kind?`&kind=${kind}`:''}`).then(x=>x.json()).then((d:Res):Promise<void>|void=>{if(!live)return;
      if((d.counts[main]??0)<(kind?3:2)&&i<steps.length-1)return load(i+1);setRes(d);setRadius(steps[i]);});
    load(0).catch(()=>{if(live)setRes({counts:{} as Res['counts'],open:0,items:[]});});
    if(!kind||kind==='hospital')fetch(`/api/near?${ll}&km=30&kind=hospital&sub=24시&limit=3`).then(x=>x.json()).then((d:Res)=>{if(live)setH24(d.items);}).catch(()=>{});
    return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const first=res?.items.find(p=>p.kind===main);
  const shown=KIND_ORDER.filter(k=>(!kind||k===kind)&&(res?.counts[k]??0)>0);
  const e=h24?.[0];
  const er=e&&<p className={night?'pt-er night':'pt-er'}>{night?'🌙 지금은 일반 동물병원 진료가 끝났을 수 있어요. ':'🚨 '}가장 가까운 <b>24시 동물병원</b>: <a href={placePath(e.id)}><b>{e.name}</b></a> {e.km!=null&&km(e.km)}
    {e.tel&&<> · <a className="pt-call" href={telHref(e.tel)}>📞 {e.tel}</a></>}<small>이름에 ‘24’가 든 곳이에요. 가기 전에 꼭 전화로 확인하세요.</small></p>;
  return <section className="pt-near">
    {!pos?.precise&&<LocateCard title={`내 위치 주변 ${kind?KINDS[kind].label:'동물병원·동물약국'} 보기`} desc="가까운 순으로 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!res&&<p className="pt-answer muted">내 주변 찾는 중…</p>}
    {night&&er}
    {res&&<>
      <p className="pt-answer">{shown.length?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 {shown.map((k,i)=><span key={k}>{i>0&&' · '}{KINDS[k].label} <b>{n(res.counts[k])}곳</b>{k==='pharmacy'&&res.open>0&&<> (지금 문 연 곳 <b>{n(res.open)}</b>)</>}</span>)}
        {first&&<>{' '}— 가장 가까운 {KINDS[main].label} <a href={placePath(first.id)}><b>{first.name}</b></a> {first.km!=null&&km(first.km)}</>}</>
        :<>📍 {radius}km 안에 등록된 곳이 없어요. 지역 목록에서 찾아보세요.</>}</p>
      {!night&&er}
      {res.items.length>0&&<PlaceList items={res.items} limit={12} kind={kind}/>}
    </>}
  </section>;
}
