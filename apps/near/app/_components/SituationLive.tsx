'use client';
// 상황별 페이지의 '지금 내 주변' 묶음. 위치 하나로 여러 사이트 API를 함께 불러 카드 목록으로 보여 준다.
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,here} from '@guidejung/ui/geo';
import type {Area} from '@guidejung/ui/network';
import * as L from '../../lib/live';
import {km,n} from '../../lib/site';

type Item={name:string;sub?:string;href:string;tone?:'good'|'warn'};
type Block={key:string;icon:string;title:string;items?:Item[]|null;more?:[string,string];empty?:string};
const U=L.SITE_URL;
const DAY=['일','월','화','수','목','금','토'];
// 카드 순서는 응답이 오는 순서가 아니라 상황에 맞는 순서로 고정.
const ORDER:Record<string,string[]>={'sick-kid':['ped','ph','er','pk'],weekend:['wx','fest','place','oil'],'car-trouble':['rp','in','oil','ev'],
  suneung:['day','ph','hp','pk'],foliage:['wx','spot','fest','oil'],'winter-car':['cold','rp','in','oil','ev'],'new-year':['sun','spot','stay','oil']};

const ymdDay=(ymd:string)=>new Date(Date.UTC(+ymd.slice(0,4),+ymd.slice(4,6)-1,+ymd.slice(6,8))).getUTCDay();
async function blocks(kind:string,a:Area,lat:number,lon:number,put:(b:Block)=>void,day?:string){
  const ll=`lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  if(kind==='sick-kid'){
    L.hospitalOpen(lat,lon,5,'pediatrics').then(d=>put({key:'ped',icon:'🧒',title:'지금 진료 중인 소아청소년과 (5km)',items:d?.items.map(h=>({name:h.name,sub:`${km(h.km)} · ${h.div??''}`,href:`${U.hospital}/hospital/${h.id}`,tone:'good'})),more:['소아청소년과 더 보기',`${U.hospital}/region/${a.c}/pediatrics`],empty:'5km 안에 지금 진료 중인 소아청소년과가 없어요. 아래 응급실이나 달빛어린이병원을 확인하세요.'}));
    L.pharmacyOpen(lat,lon,2).then(d=>put({key:'ph',icon:'💊',title:'지금 문 연 약국 (2km)',items:d?.items.map(p=>({name:p.name,sub:km(p.km),href:`${U.pharmacy}/pharmacy/${p.id}`,tone:'good'})),more:['약국 더 보기',`${U.pharmacy}/region/${a.c}`],empty:'2km 안에 지금 문 연 약국이 없어요.'}));
    L.er(lat,lon).then(d=>put({key:'er',icon:'🚑',title:'가까운 응급실 · 지금 남은 병상',items:d?.items.map(e=>({name:e.name,sub:`${km(e.km)}${e.beds!=null?` · 남은 병상 ${n(e.beds)}`:' · 병상 정보 없음'}${e.er_tel?` · ☎ ${e.er_tel}`:''}`,href:`${U.hospital}/hospital/${e.id}`,tone:e.beds?'good':'warn'})),more:['응급실 모두 보기',`${U.hospital}/er`],empty:'응급실 정보를 불러오지 못했어요. 급하면 119에 전화하세요.'}));
    L.parking(lat,lon,1).then(d=>put({key:'pk',icon:'🅿️',title:'가까운 공영 주차장 (1km)',items:d?.items.slice(0,3).map(p=>({name:p.name,sub:`${km(p.km)} · ${p.charge}`,href:`${U.parking}/parking/${p.id}`})),more:['주차장 더 보기',`${U.parking}/region/${a.c}`],empty:'1km 안에 등록된 공영 주차장이 없어요.'}));
  }
  if(kind==='weekend'||kind==='foliage'){
    L.weather(a).then(w=>{const days=(w?.weekend??[]).filter(d=>{const t=new Date(Date.UTC(+d.date.slice(0,4),+d.date.slice(4,6)-1,+d.date.slice(6,8))).getUTCDay();return t===0||t===6;}).slice(0,2);
      put({key:'wx',icon:'🌤️',title:`${a.n} 이번 주말 날씨`,items:w?days.map(d=>{const t=new Date(Date.UTC(+d.date.slice(0,4),+d.date.slice(4,6)-1,+d.date.slice(6,8))).getUTCDay();const pop=Math.max(d.am.pop,d.pm.pop);
        return {name:`${DAY[t]}요일 ${d.pm.sky??d.am.sky}`,sub:`${d.min}~${d.max}° · 비 올 확률 ${pop}%`,href:`${U.weather}/region/${a.w}`,tone:pop>=60?'warn':'good'};}):null,more:['주말 날씨 전국 보기',`${U.weather}/weekend`],empty:'주말 예보가 아직 없어요.'});});
  }
  if(kind==='foliage'){
    const q='%EB%8B%A8%ED%92%8D';// 단풍
    L.trip(lat,lon,`&kind=place&q=${q}`,100,15).then(d=>put({key:'spot',icon:'🍁',title:'내 주변 단풍 명소 (100km)',items:d?.items.filter(i=>!/도서관|전당|센터|학교|아파트|회관|극장|박물관|카페|식당/.test(i.name)).slice(0,5).map(i=>({name:i.name,sub:i.region_name,href:L.tripPath(i)})),more:['단풍 명소 더 보기',`${U.trip}/search?${ll}&radius_km=100&q=${q}`],empty:'100km 안에서 찾지 못했어요.'}));
    L.trip(lat,lon,`&kind=festival&q=${q}`,100).then(d=>put({key:'fest',icon:'🎪',title:'단풍 축제·행사 (100km)',items:d?.items.map(i=>({name:i.name,sub:i.region_name,href:L.tripPath(i)})),more:['축제 더 보기',`${U.trip}/festival`],empty:'100km 안에 열리는 단풍 축제가 없어요.'}));
    L.cheapOil(lat,lon,5).then(d=>put({key:'oil',icon:'⛽',title:'출발 전 최저가 주유소 (5km)',items:d?.best?[{name:d.best.name,sub:`휘발유 ${n(d.best.prices.B027!)}원 · ${km(d.best.km)}`,href:`${U.oil}/station/${d.best.id}`,tone:'good'}]:null,more:['주유소 더 보기',a.o?`${U.oil}/region/${a.o}`:U.oil]}));
  }
  if(kind==='weekend'){
    L.trip(lat,lon,'&kind=festival&when=weekend',50).then(d=>put({key:'fest',icon:'🎪',title:'이번 주말 행사 (50km)',items:d?.items.map(i=>({name:i.name,sub:i.region_name,href:L.tripPath(i)})),more:['주말 행사 더 보기',`${U.trip}/search?${ll}&radius_km=50&when=weekend&kind=festival`],empty:'50km 안에 이번 주말 행사가 없어요.'}));
    L.trip(lat,lon,'&kind=place',20).then(d=>put({key:'place',icon:'🚗',title:'가까운 가볼만한곳 (20km)',items:d?.items.map(i=>({name:i.name,sub:i.region_name,href:L.tripPath(i)})),more:['가볼만한곳 더 보기',`${U.trip}/search?${ll}&radius_km=20&kind=place`]}));
    L.cheapOil(lat,lon,5).then(d=>put({key:'oil',icon:'⛽',title:'출발 전 최저가 주유소 (5km)',items:d?.best?[{name:d.best.name,sub:`휘발유 ${n(d.best.prices.B027!)}원 · ${km(d.best.km)}`,href:`${U.oil}/station/${d.best.id}`,tone:'good'}]:null,more:['주유소 더 보기',a.o?`${U.oil}/region/${a.o}`:U.oil]}));
  }
  if(kind==='suneung'||kind==='new-year'){
    const ymd=(day??'').replace(/-/g,'');
    L.weather(a).then(w=>{const d=w?.weekend.find(x=>x.date===ymd);const pop=d?Math.max(d.am.pop,d.pm.pop):0;
      put({key:kind==='suneung'?'day':'sun',icon:'🌤️',title:`${a.n} ${kind==='suneung'?'수능날':'1월 1일'} 날씨`,items:w?(d?[{name:`${DAY[ymdDay(d.date)]}요일 ${d.am.sky} → ${d.pm.sky}`,sub:`아침 최저 ${d.min}° · 낮 최고 ${d.max}° · 비·눈 확률 ${pop}%`,href:`${U.weather}/region/${a.w}`,tone:pop>=60?'warn':'good'}]:[]):null,
        more:['우리 동네 예보 보기',`${U.weather}/region/${a.w}`],empty:'아직 예보가 없어요. 10일 앞부터 예보가 나와요(기상청 중기예보).'});});
  }
  if(kind==='suneung'){
    L.pharmacyOpen(lat,lon,2).then(d=>put({key:'ph',icon:'💊',title:'지금 문 연 약국 (2km)',items:d?.items.map(p=>({name:p.name,sub:km(p.km),href:`${U.pharmacy}/pharmacy/${p.id}`,tone:'good'})),more:['약국 더 보기',`${U.pharmacy}/region/${a.c}`],empty:'2km 안에 지금 문 연 약국이 없어요.'}));
    L.hospitalOpen(lat,lon,3).then(d=>put({key:'hp',icon:'🏥',title:'지금 진료하는 병원 (3km)',items:d?.items.map(h=>({name:h.name,sub:`${km(h.km)}${h.div?` · ${h.div}`:''}`,href:`${U.hospital}/hospital/${h.id}`,tone:'good'})),more:['병원 더 보기',`${U.hospital}/region/${a.c}`]}));
    L.parking(lat,lon,1).then(d=>put({key:'pk',icon:'🅿️',title:'가까운 공영 주차장 (1km) — 시험장 200m 앞은 차량 통제',items:d?.items.slice(0,3).map(p=>({name:p.name,sub:`${km(p.km)} · ${p.charge}`,href:`${U.parking}/parking/${p.id}`})),more:['주차장 더 보기',`${U.parking}/region/${a.c}`],empty:'1km 안에 등록된 공영 주차장이 없어요.'}));
  }
  if(kind==='winter-car'){
    L.weather(a).then(w=>{const cold=(w?.weekend??[]).slice(0,7).reduce<{date:string;min:number}|null>((m,d)=>!m||d.min<m.min?{date:d.date,min:d.min}:m,null);
      put({key:'cold',icon:'🥶',title:`${a.n} 이번 주 가장 추운 날`,items:w&&cold?[{name:`${+cold.date.slice(4,6)}월 ${+cold.date.slice(6,8)}일(${DAY[ymdDay(cold.date)]}) 아침 ${cold.min}°`,sub:cold.min<=0?'영하로 내려가요 — 배터리·냉각수 점검을 서두르세요':'아직 영상이지만 미리 점검해 두세요',href:`${U.weather}/region/${a.w}`,tone:cold.min<=0?'warn':'good'}]:null,more:['10일 예보 보기',`${U.weather}/region/${a.w}`]});});
  }
  if(kind==='winter-car'||kind==='car-trouble'){
    L.repair(lat,lon,'repair',3).then(d=>put({key:'rp',icon:'🔧',title:'가까운 자동차 정비소 (3km)',items:d?.items.map(r=>({name:r.name,sub:`${km(r.km)}${r.sub?` · ${r.sub}`:''}`,href:`${U.service}/center/${r.id}`})),more:['정비소 더 보기',`${U.service}/region/${a.c}/repair`],empty:'3km 안에 등록된 정비소가 없어요.'}));
    L.repair(lat,lon,'inspect',10).then(d=>put({key:'in',icon:'🧾',title:'가까운 자동차 검사소 (10km)',items:d?.items.map(r=>({name:r.name,sub:`${km(r.km)}${r.sub?` · ${r.sub}`:''}`,href:`${U.service}/center/${r.id}`})),more:['검사 안내·과태료 계산',`${U.service}/inspection`],empty:'10km 안에 등록된 검사소가 없어요.'}));
    L.cheapOil(lat,lon,3).then(d=>put({key:'oil',icon:'⛽',title:'가까운 주유소 (3km)',items:d?.best?[{name:d.best.name,sub:`휘발유 ${n(d.best.prices.B027!)}원 · ${km(d.best.km)}`,href:`${U.oil}/station/${d.best.id}`}]:null,more:['주유소 더 보기',a.o?`${U.oil}/region/${a.o}`:U.oil]}));
    L.chargers(a).then(d=>put({key:'ev',icon:'⚡',title:`${a.n} 전기차 충전`,items:d?[{name:`지금 급속 ${n(d.ok)}대 사용 가능`,sub:`충전소 ${n(d.stations)}곳 · 급속 ${n(d.fast)}대`,href:`${U.charge}/region/${a.c}`,tone:d.ok?'good':'warn'}]:null}));
  }
  if(kind==='new-year'){
    // 소개 글에 '해돋이'가 들어간 가볼만한곳 — 이름이 도서관·공연장처럼 명소가 아닌 곳은 뺀다.
    L.trip(lat,lon,'&kind=place&q=%ED%95%B4%EB%8F%8B%EC%9D%B4',100,15).then(d=>put({key:'spot',icon:'🌅',title:'내 주변 해돋이 명소 (100km)',items:d?.items.filter(i=>!/도서관|전당|센터|학교|아파트|회관|극장|박물관/.test(i.name)).slice(0,4).map(i=>({name:i.name,sub:i.region_name,href:L.tripPath(i)})),more:['해돋이 명소 더 보기',`${U.trip}/search?${ll}&radius_km=100&q=%ED%95%B4%EB%8F%8B%EC%9D%B4`],empty:'100km 안에서 찾지 못했어요. 전국 해돋이 명소를 보세요.'}));
    L.trip(lat,lon,'&kind=stay',30).then(d=>put({key:'stay',icon:'🏨',title:'가까운 숙소 (30km)',items:d?.items.map(i=>({name:i.name,sub:i.region_name,href:L.tripPath(i)})),more:['숙소 더 보기',`${U.trip}/search?${ll}&radius_km=30&kind=stay`]}));
    L.cheapOil(lat,lon,5).then(d=>put({key:'oil',icon:'⛽',title:'출발 전 최저가 주유소 (5km)',items:d?.best?[{name:d.best.name,sub:`휘발유 ${n(d.best.prices.B027!)}원 · ${km(d.best.km)}`,href:`${U.oil}/station/${d.best.id}`,tone:'good'}]:null,more:['주유소 더 보기',a.o?`${U.oil}/region/${a.o}`:U.oil]}));
  }
}

export function SituationLive({kind,areas,day}:{kind:string;areas:Area[];day?:string}){
  const {pos,status,request}=useMyPosition();const [list,setList]=useState<Record<string,Block>>({});
  const a=pos?L.nearestArea(areas,here(pos).lat,here(pos).lon):null;
  useEffect(()=>{if(!pos||!a)return;let on=true;setList({});blocks(kind,a,pos.lat,pos.lon,b=>{if(on)setList(l=>({...l,[b.key]:b}));},day);return ()=>{on=false;};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pos?.lat,pos?.lon,kind]);
  return <section className="nr-live" aria-label="지금 내 주변">
    <p className="nr-where">{a?<>📍 <b>{a.n}</b> {pos?.precise?'내 위치':'접속 지역'} 기준 · 지금</>:status==='locating'?'위치 확인 중…':'위치를 알면 내 주변 기준으로 바로 찾아 드려요'}</p>
    <PosNote/>{!pos?.precise&&<LocateCard title="내 위치로 찾기" desc="가까운 순으로 정확하게 보여 드려요" status={status} onClick={request} approxLabel={pos&&a?a.n:undefined}/>}
    {pos&&!Object.keys(list).length&&<p className="muted">불러오는 중…</p>}
    <div className="nr-blocks">{(ORDER[kind]??[]).map(k=>list[k]).filter((b):b is Block=>!!b).map(b=><div key={b.key} className="nr-block"><h3>{b.icon} {b.title}</h3>
      {b.items==null?<p className="muted small">지금은 불러오지 못했어요.</p>:b.items.length?<ul>{b.items.map(i=><li key={i.href+i.name}><a className={i.tone??''} href={i.href}><b>{i.name}</b>{i.sub&&<small>{i.sub}</small>}</a></li>)}</ul>:<p className="muted small">{b.empty??'찾지 못했어요.'}</p>}
      {b.more&&<a className="nr-more" href={b.more[1]}>{b.more[0]} →</a>}</div>)}</div>
  </section>;
}
