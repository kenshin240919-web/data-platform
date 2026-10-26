// GuideJung network: every page of trip·weather·traffic·charge links to the others (사이트 간 순환 = 클릭·체류).
// Server-safe (no hooks). Data: weather regions (시군구 centres) and traffic routes/rest areas (static snapshots).
import weatherRegions from '../../../apps/weather/data/regions.json';
import traffic from '../../../apps/traffic/data/snapshot.json';
import oilAreas from '../../../apps/oil/data/areas.json';
import {InstallHint} from './install';
import {SeasonBanner} from './season';
import {ACTIONS_JS} from './actions';

export type Site='trip'|'weather'|'traffic'|'charge'|'academy'|'school'|'pharmacy'|'hospital'|'oil'|'parking'|'service'|'near'|'rest'|'pet';
// brand: 사이트 이름(로고·탭 제목), tagline: 부제(질문형 후킹). 10/17 사용자 결정: "내근처" 시리즈.
// hidden: 아직 배포 전인 사이트(그 사이트 자신의 연결 바에만 보임).
export const SITES:Record<Site,{url:string;icon:string;name:string;brand:string;tagline:string;hidden?:boolean}>={
  trip:{url:'https://trip.guidejung.com',icon:'🚗',name:'여행',brand:'내근처 여행',tagline:'오늘 어디가?'},
  weather:{url:'https://weather.guidejung.com',icon:'🌤️',name:'날씨',brand:'내근처 날씨',tagline:'오늘 날씨 어때?'},
  traffic:{url:'https://traffic.guidejung.com',icon:'🛣️',name:'고속도로',brand:'내근처 고속도로',tagline:'지금 길 막혀?'},
  charge:{url:'https://charge.guidejung.com',icon:'⚡',name:'충전소',brand:'내근처 충전소',tagline:'지금 바로 충전 가능한 곳'},
  academy:{url:'https://academy.guidejung.com',icon:'🎓',name:'학원',brand:'내근처 학원',tagline:'우리 동네 학원비 얼마야?'},
  school:{url:'https://school.guidejung.com',icon:'🏫',name:'학교',brand:'내 학교',tagline:'오늘 급식 뭐야?'},
  pharmacy:{url:'https://pharmacy.guidejung.com',icon:'💊',name:'약국',brand:'내근처 약국',tagline:'지금 문 연 약국 어디?'},
  hospital:{url:'https://hospital.guidejung.com',icon:'🏥',name:'병원',brand:'내근처 병원',tagline:'지금 진료하는 병원 어디?'},
  oil:{url:'https://oil.guidejung.com',icon:'⛽',name:'주유소',brand:'내근처 주유소',tagline:'기름값 제일 싼 곳 어디?'},
  parking:{url:'https://parking.guidejung.com',icon:'🅿️',name:'주차장',brand:'내근처 주차장',tagline:'여기 주차 어디 해?'},
  service:{url:'https://service.guidejung.com',icon:'🔧',name:'정비소',brand:'내근처 서비스센터',tagline:'고장 났다, 어디로 가지?'},
  near:{url:'https://near.guidejung.com',icon:'📍',name:'모아보기',brand:'내근처',tagline:'내 근처에 뭐가 있지?'},
  rest:{url:'https://rest.guidejung.com',icon:'♨️',name:'휴식',brand:'내근처 휴식',tagline:'오늘 어디서 쉬지?'},
  pet:{url:'https://pet.guidejung.com',icon:'🐾',name:'동물병원',brand:'내근처 동물병원',tagline:'우리 아이 아플 때 어디로?'},
};
const {trip:T,weather:W,traffic:R,charge:C}=Object.fromEntries(Object.entries(SITES).map(([k,v])=>[k,v.url])) as Record<Site,string>;

/** 모든 페이지 맨 위: 내근처 사이트 바로가기 한 줄(hidden 사이트는 자기 사이트에서만 보임). */
/** 운영자 정보: 네이버 검색광고 비즈채널 심사에 사이트 하단 담당자·이메일이 필요함. */
export function Contact(){return <>담당자: 가이드정 · 문의: <a href="mailto:kenshin240919@gmail.com">kenshin240919@gmail.com</a></>;}

export function NetworkBar({current}:{current:Site}){
  return <><nav className="gj-network" aria-label="내근처 서비스"><div>{current==='near'?<b className="gj-network-brand">📍 내근처</b>:<a className="gj-network-brand" href={SITES.near.url}>📍 내근처</a>}{(Object.keys(SITES) as Site[]).filter(k=>!SITES[k].hidden||k===current).map(k=>k===current
    ?<span key={k} className="on" aria-current="page">{SITES[k].icon} {SITES[k].name}</span>
    :<a key={k} href={SITES[k].url}>{SITES[k].icon} {SITES[k].name}</a>)}</div></nav><SeasonBanner site={current}/><InstallHint brand={SITES[current].brand}/><script dangerouslySetInnerHTML={{__html:ACTIONS_JS}}/></>;
}

export type Link_={icon:string;title:string;desc:string;href:string};
/** 맥락 연결 카드: 페이지 내용과 이어지는 다른 사이트 버튼. */
export function Connect({title='함께 보면 좋은 정보',items}:{title?:string;items:Link_[]}){
  if(!items.length)return null;
  return <section className="gj-connect" aria-label={title}><h2>🔗 {title}</h2><div>{items.map(i=><a key={i.href+i.title} href={i.href}>
    <span className="gj-connect-icon" aria-hidden="true">{i.icon}</span><span><b>{i.title}</b><small>{i.desc}</small></span><span className="gj-connect-go" aria-hidden="true">→</span></a>)}</div></section>;
}

type WR={code:string;sido:string;sidoShort:string;name:string;lat:number;lon:number};
const regions=weatherRegions as WR[];
// 주유소 사이트는 오피넷 시군구 코드를 써서 이름으로 맞춤('수원시 장안구' → 수원시).
const OIL=new Map((oilAreas as {name:string;sigungu:{code:string;name:string}[]}[]).flatMap(a=>a.sigungu.map(g=>[`${a.name} ${g.name}`,g.code] as const)));
const oilCode=(r:WR)=>OIL.get(`${r.sidoShort} ${r.name}`)??OIL.get(`${r.sidoShort} ${r.name.split(' ')[0]}`)??null;
const dist=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const x=(bLon-aLon)*Math.cos(aLat*Math.PI/180);return Math.sqrt((bLat-aLat)**2+x**2)*111;};
/** 시군구 목록과 사이트별 지역 코드(w: 날씨, c: 충전소·약국·병원·주차장·서비스센터·학교, o: 주유소) — 브라우저에서 가까운 지역을 찾을 때. */
export const AREAS=regions.map(r=>({w:r.code,c:r.name.includes(' ')?r.code.slice(0,4)+'0':r.code,o:oilCode(r),n:r.name.startsWith(r.sidoShort)?r.name:`${r.sidoShort} ${r.name}`,lat:r.lat,lon:r.lon}));
export type Area=(typeof AREAS)[number];
/** Nearest 시군구 (weather code; charge folds only 일반구 like "수원시 장안구" into the city code). */
export function nearArea(lat:number,lon:number){
  const r=regions.reduce((a,b)=>dist(lat,lon,b.lat,b.lon)<dist(lat,lon,a.lat,a.lon)?b:a);
  return {weather:r.code,charge:r.name.includes(' ')?r.code.slice(0,4)+'0':r.code,oil:oilCode(r),label:r.name.startsWith(r.sidoShort)?r.name:`${r.sidoShort} ${r.name}`,lat:r.lat,lon:r.lon,sidoShort:r.sidoShort};
}

type Route={no:string;name:string;pts?:[number,number][]};type Rest={code:string;name:string;lat:number;lng:number;dir:string};
const routes=(traffic as unknown as {routes:Route[]}).routes,rests=(traffic as unknown as {rests:Rest[]}).rests;
const road=(n:string)=>{const base=n.replace(/\(.+\)$/,''),sub=n.match(/\(.+\)$/)?.[0]??'';return /선$/.test(base)?base.replace(/선$/,'고속도로')+sub:n;};
/** Nearest highway (by its IC points) and km to it. */
export function nearRoad(lat:number,lon:number){
  let best:{r:Route;d:number}|null=null;
  for(const r of routes)for(const p of r.pts??[]){const d=dist(lat,lon,p[0],p[1]);if(!best||d<best.d)best={r,d};}
  return best?{no:best.r.no,name:road(best.r.name),km:Math.round(best.d)}:null;
}
export function nearRests(lat:number,lon:number,n=2,maxKm=40){
  return rests.map(r=>({r,d:dist(lat,lon,r.lat,r.lng)})).filter(x=>x.d<=maxKm).sort((a,b)=>a.d-b.d).slice(0,n).map(({r,d})=>({code:r.code,name:r.name,km:Math.round(d)}));
}

/** Which sister sites matter most from each site (사이트 간 순환): first ones are shown first, up to MAX_LINKS. */
const ORDER:Record<Site,Site[]>={
  trip:['parking','weather','oil','charge','traffic','pharmacy','hospital'],
  weather:['trip','parking','traffic','oil','charge','pharmacy','hospital'],
  traffic:['oil','service','parking','trip','charge','weather','rest'],
  charge:['trip','parking','weather','service','traffic','academy','rest'],
  academy:['parking','hospital','pharmacy','school','trip','weather'],
  school:['academy','hospital','pharmacy','parking','weather','trip'],
  pharmacy:['hospital','parking','weather','trip','academy','school','pet'],
  hospital:['pharmacy','parking','weather','trip','academy','school','pet'],
  oil:['service','charge','parking','traffic','trip','weather'],
  parking:['trip','oil','charge','service','weather','pharmacy','rest','pet'],
  service:['oil','parking','charge','traffic','weather','trip'],
  near:['weather','pharmacy','hospital','parking','oil','trip','charge'],
  rest:['parking','trip','weather','pharmacy','hospital','oil'],
  pet:['pharmacy','parking','weather','trip','hospital','rest'],
};
const MAX_LINKS=7;
/** Standard links for a spot: the sister sites' pages for the same 시군구 (or the spot itself), in the order that fits the current site. */
export function linksNear(lat:number,lon:number,skip:Site){
  const a=nearArea(lat,lon);const rd=nearRoad(lat,lon);const ll=`lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  // 약국·병원·주차장·서비스센터·학교·학원 지역 페이지는 날씨 지역표 코드(일반구는 시 코드) = charge 코드와 같음.
  const by:Partial<Record<Site,Link_[]>>={
    weather:[{icon:'🌤️',title:`${a.label} 날씨`,desc:'지금 날씨·주말 예보·미세먼지',href:`${W}/region/${a.weather}`}],
    trip:[{icon:'🚗',title:`${a.label} 근처 가볼만한곳`,desc:'20km 안 여행지·축제를 가까운 순으로',href:`${T}/search?${ll}&radius_km=20`}],
    charge:[{icon:'⚡',title:`${a.label} 전기차 충전소`,desc:'지금 비어 있는 충전기',href:`${C}/region/${a.charge}`}],
    traffic:[...(rd?[{icon:'🛣️',title:`${rd.name} 실시간 상황`,desc:`가까운 고속도로(약 ${rd.km}km) 정체·CCTV`,href:`${R}/road/${rd.no}`}]:[]),
      // 고속도로·주유소 사이트에서는 휴게소도 함께
      ...(skip==='traffic'||skip==='oil'||skip==='trip'?nearRests(lat,lon,1).map(r=>({icon:'🍜',title:r.name,desc:`약 ${r.km}km · 대표 음식·기름값`,href:`${R}/rest/${r.code}`})):[])],
    academy:[{icon:'🎓',title:`${a.label} 근처 학원·학원비`,desc:'3km 안 학원과 교육청 공개 수강료',href:`${SITES.academy.url}/search?${ll}&km=3`}],
    school:[{icon:'🏫',title:`${a.label} 학교 급식·학사일정`,desc:'초·중·고 오늘 급식과 D-day',href:`${SITES.school.url}/region/${a.charge}`}],
    pharmacy:[{icon:'💊',title:`${a.label} 지금 문 연 약국`,desc:'영업 중·심야·일요일 약국',href:`${SITES.pharmacy.url}/region/${a.charge}`}],
    hospital:[{icon:'🏥',title:`${a.label} 지금 진료하는 병원`,desc:'소아과·내과 야간·주말 진료, 응급실',href:`${SITES.hospital.url}/region/${a.charge}`}],
    oil:a.oil?[{icon:'⛽',title:`${a.label} 기름값 싼 주유소`,desc:'오늘 휘발유·경유 최저가 순',href:`${SITES.oil.url}/region/${a.oil}`}]:[],
    parking:[{icon:'🅿️',title:`${a.label} 공영·무료 주차장`,desc:'무료 주차장과 1시간 예상 요금 싼 순',href:`${SITES.parking.url}/region/${a.charge}`}],
    rest:[{icon:'♨️',title:`${a.label} 찜질방·목욕탕`,desc:'찜질방·사우나·1인 목욕·세신샵',href:`${SITES.rest.url}/region/${a.charge}`}],
    pet:[{icon:'🐾',title:`${a.label} 동물병원·24시`,desc:'동물병원·24시 동물병원·지금 문 연 동물약국',href:`${SITES.pet.url}/region/${a.charge}`}],
    service:[{icon:'🔧',title:`${a.label} 자동차 정비소·검사소`,desc:'정비소·검사소·세차장, 맡기기 전 체크리스트',href:`${SITES.service.url}/region/${a.charge}`}],
  };
  return ORDER[skip].filter(k=>k!==skip&&!SITES[k].hidden).flatMap(k=>by[k]??[]).slice(0,MAX_LINKS);
}
/** Links for a 시군구 by weather code (weather·charge region pages). */
export function linksForCode(code:string,skip:Site){
  const r=regions.find(x=>x.code===code)??regions.find(x=>x.code.slice(0,4)===code.slice(0,4));
  return r?linksNear(r.lat,r.lon,skip):[];
}
/** Generic network links when a page has no place (home, rankings). */
export const GENERIC:Record<Site,Link_>={
  trip:{icon:'🚗',title:'이번 주말 가볼만한 곳',desc:'축제·여행지를 지역별로',href:`${T}/weekend`},
  weather:{icon:'🌤️',title:'이번 주말 날씨',desc:'맑은 지역 순위·미세먼지',href:`${W}/weekend`},
  traffic:{icon:'🛣️',title:'고속도로 실시간 정체',desc:'내 근처 도로·CCTV·휴게소',href:R},
  charge:{icon:'⚡',title:'내 주변 전기차 충전소',desc:'지금 비어 있는 충전기',href:C},
  academy:{icon:'🎓',title:'우리 동네 학원·수강료',desc:'과목별 학원 수와 공개 수강료',href:SITES.academy.url},
  school:{icon:'🏫',title:'우리 학교 오늘 급식',desc:'급식·학사일정 D-day·시간표',href:SITES.school.url},
  pharmacy:{icon:'💊',title:'지금 문 연 약국',desc:'내 주변 영업 중·심야·일요일 약국',href:SITES.pharmacy.url},
  hospital:{icon:'🏥',title:'지금 진료하는 병원',desc:'소아과·내과 야간·주말 진료, 응급실 병상',href:SITES.hospital.url},
  oil:{icon:'⛽',title:'내 주변 싼 주유소',desc:'오늘 휘발유·경유 최저가',href:SITES.oil.url},
  parking:{icon:'🅿️',title:'내 주변 공영·무료 주차장',desc:'1시간·2시간 예상 요금 싼 순',href:SITES.parking.url},
  service:{icon:'🔧',title:'내 주변 자동차 정비소·검사소',desc:'정비 맡기기 전 체크리스트·검사 과태료 계산',href:SITES.service.url},
  near:{icon:'📍',title:'내 근처에 뭐가 있지?',desc:'날씨·문 연 약국·병원·주유소·주차장을 한 화면에',href:SITES.near.url},
  rest:{icon:'♨️',title:'내 주변 찜질방·목욕탕',desc:'찜질방·사우나·1인 목욕탕·세신샵',href:SITES.rest.url},
  pet:{icon:'🐾',title:'내 주변 동물병원·24시',desc:'24시 동물병원·지금 문 연 동물약국·펫호텔',href:SITES.pet.url},
};
export const genericFor=(skip:Site)=>(Object.keys(GENERIC) as Site[]).filter(k=>k!==skip&&!SITES[k].hidden).map(k=>GENERIC[k]);
export {T as TRIP_URL,W as WEATHER_URL,R as TRAFFIC_URL,C as CHARGE_URL};
