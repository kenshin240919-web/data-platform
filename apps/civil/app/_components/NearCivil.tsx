'use client';
// 메인 3초 답: 내 위치(이미 허용 → 정확, 아니면 접속 위치) 주변 '지금 운영 중인 무인민원발급기'와 가장 가까운 곳,
// 그리고 주민센터·우체국·여권 발급 기관 가장 가까운 곳. 가까운 시·구청 민원실이 실시간 대기를 주면 대기 인원도.
// 위치는 약 2km 칸 중심만 서버로(padKm으로 넓혀 받고 within으로 정확한 거리로 다시 자름).
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow,padKm,padLimit,within} from '@guidejung/ui/geo';
import {KIND_ORDER,KINDS,km,kstNow,n,placePath,stateOf,type Kind,type Slim} from '../../lib/fmt';
import {PlaceList} from './PlaceList';
type Res={counts:Record<Kind,number>;open:number;items:Slim[]};
type Wait={name:string;total:number;at:string|null;tasks:{name:string;waiting:number}[]};
export function NearCivil({kind,doc,docTitle}:{kind?:Kind;doc?:string;docTitle?:string}){
  const {pos,status,request}=useMyPosition();
  const [res,setRes]=useState<Res|null>(null);const [radius,setRadius]=useState(0);const [wait,setWait]=useState<(Wait&{id:string;km:number})|null>(null);
  const main:Kind=kind??'kiosk';
  useEffect(()=>{if(!pos)return;let live=true;setWait(null);
    const steps=main==='passport'||main==='cso'?[5,10,20,50]:pos.precise?[1,2,5,10]:[3,6,10,20];
    const q=(k:number)=>`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${padKm(k)}&per=${padLimit(kind||doc?60:12,200)}&limit=${padLimit(100,600)}${kind?`&kind=${kind}`:''}${doc?`&kind=kiosk&doc=${doc}`:''}`;
    const load=(i:number):Promise<void>=>fetch(q(steps[i])).then(x=>x.json()).then(fixKmNow).then(within(steps[i])).then((d:Res):Promise<void>|void=>{if(!live)return;
      const mine=d.items.filter(p=>p.kind===main).length;if(mine<(kind||doc?3:1)&&i<steps.length-1)return load(i+1);setRes(d);setRadius(steps[i]);});
    load(0).catch(()=>{if(live)setRes({counts:{} as Res['counts'],open:0,items:[]});});
    if(!kind||kind==='cso')fetch(`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${padKm(8)}&kind=cso&limit=1`).then(x=>x.json()).then(fixKmNow).then((d:Res)=>{const c=d.items[0];if(!live||!c||c.km!>8)return;
      fetch(`/api/wait?id=${c.id}`).then(x=>x.json()).then((w:Wait)=>{if(live&&w.tasks)setWait({...w,id:c.id,km:c.km!});}).catch(()=>{});}).catch(()=>{});
    return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,kind,doc]); // eslint-disable-line react-hooks/exhaustive-deps
  const now=kstNow();
  const mine=res?.items.filter(p=>p.kind===main)??[];
  const openMine=mine.filter(p=>stateOf(p,now).state!=='closed');
  const first=openMine[0]??mine[0];
  const nearest=(k:Kind)=>res?.items.find(p=>p.kind===k);
  const label=doc?`${docTitle} 떼는 발급기`:main==='kiosk'?'무인민원발급기':KINDS[main].label;
  return <section className="cv-near">
    <PosNote/>{!pos?.precise&&<LocateCard title={`내 위치 주변 ${label} 보기`} desc="가까운 순으로, 지금 운영 중인 곳부터 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!res&&<p className="cv-answer muted">내 주변 찾는 중…</p>}
    {res&&<>
      <p className={`cv-answer ${openMine.length?'open':'closed'}`}><span className="cv-dot" aria-hidden="true"></span>{mine.length?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 {label} <b>{n(mine.length)}{main==='kiosk'?'대':'곳'}</b>{main==='kiosk'||main==='post'||main==='passport'?<> · 지금 운영 중 <b>{n(openMine.length)}</b></>:null}
        {first&&<> — 가장 가까운 곳 <a href={placePath(first.id)}><b>{first.name}</b></a> {first.km!=null&&km(first.km)} ({stateOf(first,now).label})</>}</>
        :<>📍 {radius}km 안에 {label}{main==='kiosk'?'가':'이'} 없어요. 지역 목록에서 찾아보세요.</>}</p>
      {!kind&&!doc&&<div className="cv-near-more">{(['office','post','passport'] as Kind[]).map(k=>{const x=nearest(k);return x?<a key={k} href={placePath(x.id)}><span aria-hidden="true">{KINDS[k].icon}</span><span><b>가까운 {KINDS[k].label}</b><small>{x.name} · {x.km!=null&&km(x.km)}</small></span></a>:null;})}</div>}
      {wait&&<a className="cv-waitcard" href={placePath(wait.id)}><span aria-hidden="true">⏱️</span><span><b>{wait.name} 민원실 지금 대기 {n(wait.total)}명</b><small>{wait.tasks.filter(t=>t.waiting).slice(0,3).map(t=>`${t.name} ${t.waiting}명`).join(' · ')||'기다리는 사람 없음'} · {km(wait.km)}</small></span></a>}
      {res.items.length>0&&<PlaceList items={kind||doc?res.items:res.items.filter(p=>KIND_ORDER.includes(p.kind))} limit={12} kind={kind??(doc?'kiosk':undefined)}/>}
    </>}
  </section>;
}
