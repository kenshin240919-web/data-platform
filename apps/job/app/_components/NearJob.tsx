'use client';
// 메인 3초 답: 내 위치(이미 허용 → 정확, 아니면 접속 위치)가 속한 시군구의 '관할 고용센터'와 가까운 직업소개소·새일센터·노인일자리 기관.
// 위치는 약 2km 칸 중심만 서버로(padKm으로 넓혀 받고 within으로 정확한 거리로 다시 자름 — packages/ui/src/geo.tsx).
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow,padKm,padLimit,within} from '@guidejung/ui/geo';
import {KINDS,km,n,placePath,type Kind,type Slim} from '../../lib/fmt';
import {PlaceList} from './PlaceList';
type Res={counts:Record<Kind,number>;items:Slim[];area:{code:string;name:string}|null;juris:Slim[];exact:boolean};
export function NearJob({kind}:{kind?:Kind}){
  const {pos,status,request}=useMyPosition();
  const [res,setRes]=useState<Res|null>(null);const [radius,setRadius]=useState(0);
  useEffect(()=>{if(!pos)return;let live=true;
    const wide=kind==='center'||kind==='women'||kind==='campus';
    const steps=wide?[5,10,20,50]:pos.precise?[2,5,10,20]:[3,6,10,20];
    const q=(k:number)=>`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${padKm(k)}&per=${padLimit(kind?60:12,200)}&limit=${padLimit(100,600)}${kind?`&kind=${kind}`:''}`;
    const load=(i:number):Promise<void>=>fetch(q(steps[i])).then(x=>x.json()).then(fixKmNow).then(within(steps[i])).then((d:Res):Promise<void>|void=>{if(!live)return;
      const mine=kind?d.items.filter(p=>p.kind===kind).length:d.items.length;if(mine<3&&i<steps.length-1)return load(i+1);setRes(d);setRadius(steps[i]);});
    load(0).catch(()=>{if(live)setRes({counts:{} as Res['counts'],items:[],area:null,juris:[],exact:false});});
    return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,kind]); // eslint-disable-line react-hooks/exhaustive-deps
  const count=(k:Kind)=>res?.items.filter(p=>p.kind===k).length??0;
  const c=res?.juris?.[0];
  return <section className="jb-near">
    <PosNote/>{!pos?.precise&&<LocateCard title={kind?`내 위치 주변 ${KINDS[kind].title} 보기`:'내 위치로 관할 고용센터·가까운 기관 보기'} desc="가까운 순으로 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!res&&<p className="jb-answer muted">내 주변 찾는 중…</p>}
    {res&&<>
      {(!kind||kind==='center')&&c&&<a className="jb-juris" href={placePath(c.id)}><span aria-hidden="true">🏛️</span><span>
        <small>{res.area?`📍 ${res.area.name} ${res.exact?'관할 고용센터':'에서 가까운 고용센터'}`:'가까운 고용센터'}</small>
        <b>{c.name}</b><small>{c.km!=null&&`${km(c.km)} · `}{c.addr}</small></span><em>실업급여·구직 신청 →</em></a>}
      {(!kind||kind==='center')&&c&&<p className="muted small">지금 위치 기준이에요. 실업급여는 <b>주민등록 주소지</b> 관할 센터에서 신청하니, 주소지가 다르면 <a href="/center">시군구별 관할 표</a>에서 확인하세요.</p>}
      {!kind&&<p className="jb-answer">📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 직업소개소 <b>{n(count('agency')+count('free'))}곳</b>{count('women')?<> · 새일센터 <b>{n(count('women'))}</b></>:null}{count('senior')?<> · 노인일자리 기관 <b>{n(count('senior'))}</b></>:null}</p>}
      {kind&&kind!=='center'&&<p className="jb-answer">📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 {KINDS[kind].title} <b>{n(count(kind))}곳</b>{res.items[0]&&<> — 가장 가까운 곳 <a href={placePath(res.items[0].id)}><b>{res.items[0].name}</b></a> {res.items[0].km!=null&&km(res.items[0].km)}</>}</p>}
      {res.items.length>0&&<PlaceList items={res.items} limit={12} kind={kind}/>}
      {!res.items.length&&<p className="muted">가까운 곳을 찾지 못했어요. 지역 목록에서 찾아보세요.</p>}
    </>}
  </section>;
}
