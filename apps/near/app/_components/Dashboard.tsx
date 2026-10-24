'use client';
// 첫 화면 3초 답: 내 위치(또는 접속 지역) 하나로 자매 사이트 9곳의 '지금' 정보를 한 화면에. 카드를 누르면 그 사이트의 해당 지역·장소로 바로 간다.
import {useEffect,useState} from 'react';
import {LocateCard,useMyPosition} from '@guidejung/ui/geo';
import type {Area} from '@guidejung/ui/network';
import * as L from '../../lib/live';
import {km,n} from '../../lib/site';

type Card={icon:string;title:string;answer?:string;sub?:string;href:string;state?:'good'|'warn'|'none'};
type Res=Record<string,Card|null|undefined>;
const U=L.SITE_URL;

export function Dashboard({areas}:{areas:Area[]}){
  const {pos,status,request}=useMyPosition();const [res,setRes]=useState<Res>({});
  const a=pos?L.nearestArea(areas,pos.lat,pos.lon):null;
  useEffect(()=>{if(!pos||!a)return;let on=true;const {lat,lon}=pos;setRes({});
    const put=(k:string,v:Card|null)=>{if(on)setRes(r=>({...r,[k]:v}));};
    L.weather(a).then(w=>put('weather',w?{icon:'🌤️',title:`${a.n} 날씨`,answer:w.temp!=null?`지금 ${w.temp.toFixed(1)}°`:w.sky??'',sub:[w.min!=null&&w.max!=null?`오늘 ${w.min}~${w.max}°`:'',w.pop!=null?`비 올 확률 ${w.pop}%`:'',w.air?`미세먼지 ${w.air}`:''].filter(Boolean).join(' · '),href:`${U.weather}/region/${a.w}`,state:w.air==='나쁨'||w.air==='매우 나쁨'||(w.pop??0)>=60?'warn':'good'}:null));
    L.pharmacyOpen(lat,lon,2).then(d=>put('pharmacy',d?{icon:'💊',title:'지금 문 연 약국',answer:d.total?`2km 안 ${n(d.total)}곳`:'2km 안에 없어요',sub:d.items[0]?`가장 가까운 곳 ${d.items[0].name} ${km(d.items[0].km)}`:'조금 더 넓게 찾아보세요',href:d.items[0]?`${U.pharmacy}/pharmacy/${d.items[0].id}`:`${U.pharmacy}/region/${a.c}`,state:d.total?'good':'warn'}:null));
    L.hospitalOpen(lat,lon,2).then(d=>put('hospital',d?{icon:'🏥',title:'지금 진료하는 병원',answer:d.total?`2km 안 ${n(d.total)}곳`:'2km 안에 없어요',sub:d.items[0]?`가장 가까운 곳 ${d.items[0].name} ${km(d.items[0].km)}`:'응급실·야간 진료는 병원 사이트에서',href:d.items[0]?`${U.hospital}/hospital/${d.items[0].id}`:`${U.hospital}/region/${a.c}`,state:d.total?'good':'warn'}:null));
    L.cheapOil(lat,lon,3).then(d=>put('oil',d?{icon:'⛽',title:'가까운 최저가 주유소',answer:d.best?`휘발유 ${n(d.best.prices.B027!)}원`:'3km 안 가격 정보 없음',sub:d.best?`${d.best.name} ${km(d.best.km)}`:'',href:d.best?`${U.oil}/station/${d.best.id}`:a.o?`${U.oil}/region/${a.o}`:U.oil}:null));
    L.freeParking(lat,lon,1).then(d=>put('parking',d?{icon:'🅿️',title:'무료 공영 주차장',answer:d.total?`1km 안 ${n(d.total)}곳`:'1km 안에 없어요',sub:d.items[0]?`가장 가까운 곳 ${d.items[0].name} ${km(d.items[0].km)}`:'유료 주차장 예상 요금 보기',href:d.items[0]?`${U.parking}/parking/${d.items[0].id}`:`${U.parking}/region/${a.c}`,state:d.total?'good':'none'}:null));
    L.chargers(a).then(d=>put('charge',d?{icon:'⚡',title:`${a.n} 전기차 충전`,answer:`지금 급속 ${n(d.ok)}대 사용 가능`,sub:`충전소 ${n(d.stations)}곳 · 급속 ${n(d.fast)}대`,href:`${U.charge}/region/${a.c}`,state:d.ok?'good':'warn'}:null));
    L.trip(lat,lon,'&kind=place,festival',20).then(d=>put('trip',d?{icon:'🚗',title:'가까운 가볼만한곳',answer:d.total?`20km 안 ${n(d.total)}곳`:'20km 안에 없어요',sub:d.items[0]?`가까운 곳 ${d.items[0].name}`:'',href:`${U.trip}/search?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&radius_km=20`}:null));
    L.repair(lat,lon,'repair',2).then(d=>put('service',d?{icon:'🔧',title:'자동차 정비소',answer:d.total?`2km 안 ${n(d.total)}곳`:'2km 안에 없어요',sub:d.items[0]?`가장 가까운 곳 ${d.items[0].name} ${km(d.items[0].km)}`:'',href:`${U.service}/region/${a.c}`}:null));
    return ()=>{on=false;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pos?.lat,pos?.lon]);
  const order=['weather','pharmacy','hospital','oil','parking','charge','trip','service'];
  const base:Record<string,Card>={weather:{icon:'🌤️',title:'우리 동네 날씨',href:U.weather},pharmacy:{icon:'💊',title:'지금 문 연 약국',href:U.pharmacy},hospital:{icon:'🏥',title:'지금 진료하는 병원',href:U.hospital},oil:{icon:'⛽',title:'가까운 최저가 주유소',href:U.oil},parking:{icon:'🅿️',title:'무료 공영 주차장',href:U.parking},charge:{icon:'⚡',title:'전기차 충전',href:U.charge},trip:{icon:'🚗',title:'가까운 가볼만한곳',href:U.trip},service:{icon:'🔧',title:'자동차 정비소',href:U.service}};
  return <section className="nr-board" aria-label="내 주변 지금">
    <p className="nr-where">{a?<>📍 <b>{a.n}</b> {pos?.precise?'내 위치':'접속 지역'} 기준 · 지금</>:status==='locating'?'위치 확인 중…':'위치를 알면 우리 동네 정보로 바로 바꿔 드려요'}</p>
    {!pos?.precise&&<LocateCard title="내 위치로 한 번에 보기" desc="날씨·문 연 약국·병원·최저가 주유소·무료 주차장을 내 주변 기준으로" status={status} onClick={request} approxLabel={pos&&a?a.n:undefined}/>}
    <div className="nr-cards">{order.map(k=>{const c=res[k]===undefined||res[k]===null?base[k]:res[k]!;const loading=pos&&res[k]===undefined;
      return <a key={k} className={`nr-card ${c.state??''}`} href={c.href}><span className="nr-card-icon" aria-hidden="true">{c.icon}</span><span className="nr-card-body"><small>{c.title}</small>
        <b>{loading?'불러오는 중…':c.answer??'바로 가기 →'}</b>{c.sub&&<small className="muted">{c.sub}</small>}{res[k]===null&&<small className="muted">지금은 불러오지 못했어요 · 눌러서 보기</small>}</span></a>;})}</div>
  </section>;
}
