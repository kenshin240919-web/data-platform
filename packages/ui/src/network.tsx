// GuideJung network: every page of trip·weather·traffic·charge links to the others (사이트 간 순환 = 클릭·체류).
// Server-safe (no hooks). Data: weather regions (시군구 centres) and traffic routes/rest areas (static snapshots).
import weatherRegions from '../../../apps/weather/data/regions.json';
import traffic from '../../../apps/traffic/data/snapshot.json';

export type Site='trip'|'weather'|'traffic'|'charge'|'academy'|'school'|'pharmacy'|'hospital'|'oil'|'parking';
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
};
const {trip:T,weather:W,traffic:R,charge:C}=Object.fromEntries(Object.entries(SITES).map(([k,v])=>[k,v.url])) as Record<Site,string>;

/** 모든 페이지 맨 위: 내근처 사이트 바로가기 한 줄(hidden 사이트는 자기 사이트에서만 보임). */
export function NetworkBar({current}:{current:Site}){
  return <nav className="gj-network" aria-label="내근처 서비스"><div><b className="gj-network-brand">📍 내근처</b>{(Object.keys(SITES) as Site[]).filter(k=>!SITES[k].hidden||k===current).map(k=>k===current
    ?<span key={k} className="on" aria-current="page">{SITES[k].icon} {SITES[k].name}</span>
    :<a key={k} href={SITES[k].url}>{SITES[k].icon} {SITES[k].name}</a>)}</div></nav>;
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
const dist=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const x=(bLon-aLon)*Math.cos(aLat*Math.PI/180);return Math.sqrt((bLat-aLat)**2+x**2)*111;};
/** Nearest 시군구 (weather code; charge folds only 일반구 like "수원시 장안구" into the city code). */
export function nearArea(lat:number,lon:number){
  const r=regions.reduce((a,b)=>dist(lat,lon,b.lat,b.lon)<dist(lat,lon,a.lat,a.lon)?b:a);
  return {weather:r.code,charge:r.name.includes(' ')?r.code.slice(0,4)+'0':r.code,label:r.name.startsWith(r.sidoShort)?r.name:`${r.sidoShort} ${r.name}`,lat:r.lat,lon:r.lon,sidoShort:r.sidoShort};
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

/** Standard links for a spot: its weather, chargers, the road to get there, things to do nearby. */
export function linksNear(lat:number,lon:number,skip:Site){
  const a=nearArea(lat,lon);const rd=nearRoad(lat,lon);const out:Link_[]=[];
  if(skip!=='weather')out.push({icon:'🌤️',title:`${a.label} 날씨`,desc:'지금 날씨·주말 예보·미세먼지',href:`${W}/region/${a.weather}`});
  if(skip!=='trip')out.push({icon:'🚗',title:`${a.label} 근처 가볼만한곳`,desc:'20km 안 여행지·축제를 가까운 순으로',href:`${T}/search?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&radius_km=20`});
  if(skip!=='charge')out.push({icon:'⚡',title:`${a.label} 전기차 충전소`,desc:'지금 비어 있는 충전기',href:`${C}/region/${a.charge}`});
  if(skip!=='traffic'&&rd)out.push({icon:'🛣️',title:`${rd.name} 실시간 상황`,desc:`가까운 고속도로(약 ${rd.km}km) 정체·CCTV`,href:`${R}/road/${rd.no}`});
  // 여행(아이와 갈 곳·지역)·날씨·충전소 → 근처 학원(학부모 동선). 고속도로 휴게소에서는 맥락이 달라 넣지 않음.
  if(skip!=='academy'&&skip!=='traffic')out.push({icon:'🎓',title:`${a.label} 근처 학원·학원비`,desc:'3km 안 학원과 교육청 공개 수강료',href:`${SITES.academy.url}/search?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&km=3`});
  if(skip!=='traffic')for(const r of nearRests(lat,lon,1))out.push({icon:'🍜',title:r.name,desc:`약 ${r.km}km · 대표 음식·기름값`,href:`${R}/rest/${r.code}`});
  return out;
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
};
export const genericFor=(skip:Site)=>(Object.keys(GENERIC) as Site[]).filter(k=>k!==skip&&!SITES[k].hidden).map(k=>GENERIC[k]);
export {T as TRIP_URL,W as WEATHER_URL,R as TRAFFIC_URL,C as CHARGE_URL};
