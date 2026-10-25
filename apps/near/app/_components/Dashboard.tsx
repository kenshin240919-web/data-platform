'use client';
// 첫 화면 3초 답: 내 위치(또는 접속 지역) 하나로 자매 사이트의 '지금' 정보를 한 화면에.
// 카드마다 큰 답 한 줄 + 바로 할 일 버튼(길찾기·전화·더 보기). 가까운 곳에 없으면 반경을 넓혀 가장 가까운 곳을 보여 준다(빈 카드 대신 답).
import {useEffect,useState} from 'react';
import {LocateCard,useMyPosition} from '@guidejung/ui/geo';
import type {Area} from '@guidejung/ui/network';
import * as L from '../../lib/live';
import {km,n} from '../../lib/site';

type Act={label:string;href:string};
type Card={icon:string;title:string;answer?:string;sub?:string;href:string;state?:'good'|'warn'|'none';badge?:string;acts?:Act[]};
type Res=Record<string,Card|null|undefined>;
type Place={id:string;name:string;km:number;lat?:number;lon?:number;tel?:string|null};
const U=L.SITE_URL;
const route=(p:Place)=>p.lat!=null&&p.lon!=null?{label:'🧭 길찾기',href:`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`}:null;
const call=(p:Place)=>p.tel?{label:'📞 전화',href:`tel:${p.tel.replace(/[^0-9]/g,'')}`}:null;
const acts=(...a:(Act|null|false|undefined)[])=>a.filter(Boolean) as Act[];

/** 반경을 넓혀 가며 처음으로 결과가 나온 반경과 결과(모두 실패하면 null, 끝까지 0건이면 마지막 결과). */
async function widen<T extends {total:number}>(radii:number[],f:(km:number)=>Promise<T|null>):Promise<{r:number;d:T}|null>{
  let last:{r:number;d:T}|null=null;
  for(const r of radii){const d=await f(r);if(!d)return last;last={r,d};if(d.total>0)return last;}
  return last;
}

export function Dashboard({areas}:{areas:Area[]}){
  const {pos,status,request}=useMyPosition();const [res,setRes]=useState<Res>({});
  const a=pos?L.nearestArea(areas,pos.lat,pos.lon):null;
  useEffect(()=>{if(!pos||!a)return;let on=true;const {lat,lon}=pos;setRes({});
    const put=(k:string,v:Card|null)=>{if(on)setRes(r=>({...r,[k]:v}));};
    L.weather(a).then(w=>{if(!w)return put('weather',null);const rain=(w.pop??0)>=60,bad=w.air==='나쁨'||w.air==='매우 나쁨';
      put('weather',{icon:'🌤️',title:`${a.n} 날씨`,answer:w.temp!=null?`지금 ${w.temp.toFixed(1)}°`:w.sky??'',badge:rain?'☔ 우산 챙기세요':bad?'😷 마스크 챙기세요':undefined,
        sub:[w.min!=null&&w.max!=null?`오늘 ${w.min}~${w.max}°`:'',w.pop!=null?`비 ${w.pop}%`:'',w.air?`미세먼지 ${w.air}`:''].filter(Boolean).join(' · '),
        href:`${U.weather}/region/${a.w}`,state:rain||bad?'warn':'good',acts:[{label:'⏱️ 48시간 예보',href:`${U.weather}/region/${a.w}`},{label:'👕 옷차림',href:`${U.weather}/wear`}]});});
    widen([2,5,10],r=>L.pharmacyOpen(lat,lon,r)).then(x=>{if(!x)return put('pharmacy',null);const p=x.d.items[0] as Place|undefined;
      put('pharmacy',{icon:'💊',title:'지금 문 연 약국',answer:x.d.total?`${x.r}km 안 ${n(x.d.total)}곳`:'10km 안에 없어요',badge:p?'지금 영업 중':undefined,
        sub:p?`가장 가까운 곳 ${p.name} · ${km(p.km)}`:'밤·휴일 약국은 지역 페이지에서',href:p?`${U.pharmacy}/pharmacy/${p.id}`:`${U.pharmacy}/region/${a.c}`,state:x.d.total?'good':'warn',
        acts:p?acts(route(p),call(p),{label:'목록',href:`${U.pharmacy}/region/${a.c}`}):[{label:'🌙 밤·휴일 약국',href:`${U.pharmacy}/region/${a.c}`}]});});
    widen([2,5,10],r=>L.hospitalOpen(lat,lon,r)).then(x=>{if(!x)return put('hospital',null);const p=x.d.items[0] as (Place&{div?:string|null})|undefined;
      put('hospital',{icon:'🏥',title:'지금 진료하는 병원',answer:x.d.total?`${x.r}km 안 ${n(x.d.total)}곳`:'10km 안에 없어요',badge:p?'지금 진료 중':undefined,
        sub:p?`가장 가까운 곳 ${p.name}${p.div?`(${p.div})`:''} · ${km(p.km)}`:'응급실은 24시간 — 남은 병상 보기',href:p?`${U.hospital}/hospital/${p.id}`:`${U.hospital}/er`,state:x.d.total?'good':'warn',
        acts:acts(p&&route(p),p&&call(p),{label:'🚨 응급실',href:`${U.hospital}/er`})});});
    widen([3,5,10],r=>L.cheapOil(lat,lon,r)).then(x=>{if(!x)return put('oil',null);const b=x.d.best as (Place&{prices:{B027?:number|null}})|null;
      put('oil',{icon:'⛽',title:'가까운 최저가 주유소',answer:b?`휘발유 ${n(b.prices.B027!)}원`:'가격 정보 없음',sub:b?`${b.name} · ${x.r}km 안 가장 싼 곳 · ${km(b.km)}`:'',
        href:b?`${U.oil}/station/${b.id}`:a.o?`${U.oil}/region/${a.o}`:U.oil,acts:acts(b&&route(b),{label:'경유 최저가',href:`${U.oil}/diesel`})});});
    widen([1,3],r=>L.freeParking(lat,lon,r)).then(async x=>{if(!x)return put('parking',null);let p=x.d.items[0] as Place|undefined,free=!!p;
      if(!p){const any=await widen([1,3,5],r=>L.parking(lat,lon,r));p=any?.d.items[0] as Place|undefined;}  // 무료가 없으면 가장 가까운 주차장(유료)이라도
      put('parking',{icon:'🅿️',title:free?'무료 공영 주차장':'가까운 공영 주차장',answer:free?`${x.r}km 안 무료 ${n(x.d.total)}곳`:p?`무료는 없어요 · 유료 ${km(p.km)}`:'5km 안에 없어요',
        sub:p?`가장 가까운 곳 ${p.name} · ${km(p.km)}`:'시간별 예상 요금은 주차장 사이트에서',href:p?`${U.parking}/parking/${p.id}`:`${U.parking}/region/${a.c}`,state:free?'good':'none',
        acts:acts(p&&route(p),{label:'💰 시간별 요금',href:U.parking})});});
    L.chargers(a).then(d=>put('charge',d?{icon:'⚡',title:`${a.n} 전기차 충전`,answer:`급속 ${n(d.ok)}대 비어 있음`,badge:d.ok?'지금 충전 가능':undefined,sub:`충전소 ${n(d.stations)}곳 · 급속 ${n(d.fast)}대`,
      href:`${U.charge}/region/${a.c}`,state:d.ok?'good':'warn',acts:[{label:'📍 가까운 순 보기',href:U.charge}]}:null));
    L.trip(lat,lon,'&kind=place,festival',20).then(d=>{const i=d?.items[0];put('trip',d?{icon:'🚗',title:'가까운 가볼만한곳',answer:d.total?`20km 안 ${n(d.total)}곳`:'20km 안에 없어요',sub:i?`가까운 곳 ${i.name}`:'',
      href:i?L.tripPath(i):`${U.trip}/search?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&radius_km=20`,acts:[{label:'전체 보기',href:`${U.trip}/search?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&radius_km=20`},{label:'🍽️ 맛집',href:`${U.trip}/search?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&radius_km=5&kind=food`}]}:null);});
    widen([2,5,10],r=>L.repair(lat,lon,'repair',r)).then(x=>{if(!x)return put('service',null);const p=x.d.items[0] as (Place&{sub?:string})|undefined;
      put('service',{icon:'🔧',title:'자동차 정비소',answer:x.d.total?`${x.r}km 안 ${n(x.d.total)}곳`:'10km 안에 없어요',sub:p?`가장 가까운 곳 ${p.name}${p.sub?`(${p.sub})`:''} · ${km(p.km)}`:'',
        href:p?`${U.service}/center/${p.id}`:`${U.service}/region/${a.c}`,acts:acts(p&&route(p),p&&call(p),{label:'🔍 검사소',href:`${U.service}/inspection`})});});
    return ()=>{on=false;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pos?.lat,pos?.lon]);
  const order=['weather','pharmacy','hospital','oil','parking','charge','trip','service'];
  const base:Record<string,Card>={weather:{icon:'🌤️',title:'우리 동네 날씨',href:U.weather},pharmacy:{icon:'💊',title:'지금 문 연 약국',href:U.pharmacy},hospital:{icon:'🏥',title:'지금 진료하는 병원',href:U.hospital},oil:{icon:'⛽',title:'가까운 최저가 주유소',href:U.oil},parking:{icon:'🅿️',title:'무료 공영 주차장',href:U.parking},charge:{icon:'⚡',title:'전기차 충전',href:U.charge},trip:{icon:'🚗',title:'가까운 가볼만한곳',href:U.trip},service:{icon:'🔧',title:'자동차 정비소',href:U.service}};
  return <section className="nr-board" aria-label="내 주변 지금">
    <p className="nr-where">{a?<>📍 <b>{a.n}</b> {pos?.precise?'내 위치':'접속 지역'} 기준 · 지금</>:status==='locating'?'위치 확인 중…':'위치를 알면 우리 동네 정보로 바로 바꿔 드려요'}</p>
    {!pos?.precise&&<LocateCard title="내 위치로 한 번에 보기" desc="날씨·문 연 약국·병원·최저가 주유소·무료 주차장을 내 주변 기준으로" status={status} onClick={request} approxLabel={pos&&a?a.n:undefined}/>}
    <div className="nr-cards">{order.map(k=>{const c=res[k]===undefined||res[k]===null?base[k]:res[k]!;const loading=pos&&res[k]===undefined;
      return <div key={k} className={`nr-card ${c.state??''}`}>
        <a className="nr-card-main" href={c.href}><span className="nr-card-icon" aria-hidden="true">{c.icon}</span><span className="nr-card-body"><small className="nr-card-title">{c.title}</small>
          <b>{loading?'불러오는 중…':c.answer??'바로 가기 →'}</b>{c.badge&&<span className="nr-badge">{c.badge}</span>}{c.sub&&<small className="nr-card-sub">{c.sub}</small>}{res[k]===null&&<small className="nr-card-sub">지금은 불러오지 못했어요 · 눌러서 보기</small>}</span><span className="nr-go" aria-hidden="true">›</span></a>
        {!!c.acts?.length&&<span className="nr-acts">{c.acts.map(x=><a key={x.label} href={x.href}{...(x.href.startsWith('https://map.')?{target:'_blank',rel:'noopener'}:{})}>{x.label}</a>)}</span>}
      </div>;})}</div>
    <div className="nr-quick" aria-label="자주 찾는 것"><b>바로 찾기</b>
      <a href={`${U.hospital}/search?dept=pediatrics`}>🧒 소아과 진료 중</a><a href={`${U.hospital}/er`}>🚨 응급실 남은 병상</a>
      <a href={a?`${U.pharmacy}/region/${a.c}`:U.pharmacy}>🌙 밤·휴일 약국</a><a href={`${U.oil}/diesel`}>⛽ 경유 최저가</a>
      <a href={U.parking}>🅿️ 1시간 주차 싼 곳</a><a href={`${U.service}/inspection`}>🔍 자동차 검사소</a>
      <a href={U.school}>🍱 오늘 급식</a><a href={`${U.academy}/rank`}>🎓 동네 학원비 순위</a></div>
  </section>;
}
