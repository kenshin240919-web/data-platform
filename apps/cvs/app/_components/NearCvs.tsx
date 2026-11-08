'use client';
// 메인 3초 답: 내 위치 주변 상비약 파는 편의점(가까운 순) + 지금 문 연 약국 수(내근처 약국 /api/near?cond=open).
// 약국이 모두 닫았으면 '약국 대신 편의점'을 맨 앞에. 서버엔 약 2km 칸 중심만 보내고 거리는 휴대폰에서 다시 잼(fixKmNow).
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow,padLimit} from '@guidejung/ui/geo';
import {BRANDS,PHARMACY,km,n,storePath,type BrandKey,type Slim} from '../../lib/fmt';
import {StoreList} from './StoreList';
type Res={total:number;items:Slim[]};
type Ph={total:number;items:{id:string;name:string;km?:number}[]};
export function NearCvs({brand}:{brand?:BrandKey}){
  const {pos,status,request}=useMyPosition();
  const [res,setRes]=useState<Res|null>(null);const [radius,setRadius]=useState(0);const [ph,setPh]=useState<Ph|null|undefined>(undefined);
  useEffect(()=>{if(!pos)return;let live=true;
    const steps=pos.precise?[0.5,1,2,5,10]:[2,5,10,20];
    const load=(i:number):Promise<void>=>fetch(`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${steps[i]}&limit=${padLimit(60,300)}${brand?`&brand=${brand}`:''}`).then(x=>x.json()).then(fixKmNow).then((d:Res):Promise<void>|void=>{if(!live)return;
      const inside=d.items.filter(p=>p.km==null||p.km<=steps[i]);
      if(inside.length<3&&i<steps.length-1)return load(i+1);
      // 목록은 limit개까지만 오므로, 잘렸으면 서버가 센 반경 안 전체 수(d.total)를 씀
      setRes({total:d.items.length<padLimit(60,300)?inside.length:Math.max(inside.length,d.total),items:inside});setRadius(steps[i]);});
    load(0).catch(()=>{if(live)setRes({total:0,items:[]});});
    fetch(`${PHARMACY}/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=2&cond=open&limit=${padLimit(3,300)}`).then(x=>x.json()).then(fixKmNow)
      .then((d:Ph)=>{if(live){const items=d.items.filter(p=>p.km==null||p.km<=2).sort((a,b)=>(a.km??9)-(b.km??9));
        setPh({total:d.items.length<padLimit(3,300)?items.length:Math.max(items.length,d.total),items});}}).catch(()=>{if(live)setPh(null);});
    return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,brand]); // eslint-disable-line react-hooks/exhaustive-deps
  const first=res?.items[0];const label=brand?BRANDS[brand].label:'상비약 파는 편의점';
  const noPh=ph&&ph.total===0;
  return <section className="cv-near">
    <PosNote/>{!pos?.precise&&<LocateCard title={`내 위치 주변 ${label} 보기`} desc="가까운 순으로, 지금 문 연 약국과 함께" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!res&&<p className="cv-answer muted">내 주변 찾는 중…</p>}
    {res&&<>
      <p className={noPh?'cv-answer night':'cv-answer'}>{noPh&&<>🌙 2km 안에 <b>지금 문 연 약국이 없어요</b> → </>}
        {res.total?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 {label} <b>{n(res.total)}곳</b>
          {first&&<>{' '}— 가장 가까운 <a href={storePath(first.id)}><b>{first.name}</b></a> {first.km!=null&&km(first.km)}</>}</>
          :<>📍 {radius}km 안에 등록된 곳이 없어요. 지역 목록에서 찾아보세요.</>}</p>
      {ph&&ph.total>0&&<p className="cv-ph">💊 2km 안 <b>지금 문 연 약국 {n(ph.total)}곳</b>{ph.items[0]&&<> · 가장 가까운 <a href={`${PHARMACY}/pharmacy/${ph.items[0].id}`}>{ph.items[0].name}</a> {ph.items[0].km!=null&&km(ph.items[0].km)}</>} <a className="cv-ph-go" href={PHARMACY}>약국 더 보기 →</a></p>}
      {res.items.length>0&&<StoreList items={res.items} limit={12} brand={brand}/>}
    </>}
  </section>;
}
