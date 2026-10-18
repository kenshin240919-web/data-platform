import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {Suspense} from 'react';
import type {Place,Region,Results,Service,Status} from './types';
import {api,count,enabled,origin,places} from './server';
import {RegionPicker} from './controls';
import {LocalSection,MyNearby} from './mynearby';
import {Cards,SearchForm,collections,labels} from './cards';
import {Listing} from './listing';
import {search,type Query} from './search';
import {EXTRA_KINDS,KIND,KINDS} from './kinds';
import {Connect,GENERIC,genericFor,linksNear,CHARGE_URL as CHARGE,TRAFFIC_URL as TRAFFIC,WEATHER_URL as WEATHER} from './network';
import {rssXml} from './rss';
import {DetailView,ShellView,TRIP_DESC,placeDescription} from './views';
import {Faq,JsonLd,breadcrumbLd,type QA} from './seo';
import {ADSENSE_CLIENT} from './adsense';
import {AdSlot} from './ads';
export {ADSENSE_CLIENT};
export {AdSenseScript} from './adsense-script';
export {IMAGE_FALLBACK} from './kinds';


const services=[['trip','여행','축제 · 행사 · 가볼만한곳','✳'],['traffic','교통','도로 · CCTV · 교통상황','↗'],['academy','교육','학원 · 교습소 · 수강료','▤'],['charge','전기차','충전소 · 사용가능 충전기','ϟ'],['weather','날씨','지역 · 여행 · 생활날씨','◌']];

export async function Shell({children,service}:{children:React.ReactNode;service:Service}){
  let status:Status|null=null;try{status=await api<Status>('/v1/status');}catch{}
  return <ShellView status={status} trip={service==='home'?origin('trip'):''}>{children}</ShellView>;
}


async function landing(service:Service){
  const [regionData,status,places]=await Promise.all([api<{items:Region[]}>('/v1/regions'),api<Status>('/v1/status'),api<Results>('/v1/search?kind=place&limit=6')]);
  const trip=service==='home'?origin('trip'):'';
  return <><MyNearby base={trip}/><section className={`hero ${service}`}><div className="hero-body"><div className="eyebrow">{service==='home'?'GUIDEJUNG · EVERYDAY DISCOVERY':'GUIDEJUNG TRIP · 대한민국 여행 찾기'}</div><h1>{service==='home'?<>필요한 정보를<br/>바로 찾아보세요<span>.</span></>:<>오늘, 어디로<br/>떠나볼까요<span>?</span></>}</h1><p>{service==='home'?'여행부터 생활정보까지, 지역을 중심으로 한곳에서.':'가볼만한곳과 축제, 내게 맞는 주말을 찾아보세요.'}</p><SearchForm regions={regionData.items} target={`${trip}/search`}/><div className="quick-links"><span>이런 여행은 어때요</span>{Object.entries(labels).map(([key,label])=><Link key={key} href={`${trip}/${key}`}>{label}</Link>)}</div></div><aside className="hero-aside"><div className="aside-label">YOUR NEXT DISCOVERY</div><div className="big-symbol" aria-hidden="true">⌖</div><h2>지역에서 시작하는<br/>새로운 발견</h2><div className="aside-stats"><div><strong>{Number(status.place_count).toLocaleString()}</strong><span>{status.mode==='demo'?'샘플 장소':'공개 장소'}</span></div><div><strong>{regionData.items.length}</strong><span>탐색 가능한 지역</span></div></div></aside></section>{service==='home'&&<section className="service-grid" aria-label="GuideJung 서비스">{services.map(([id,name,desc,icon])=>id==='trip'?<Link className="service-card ready" href={origin('trip')} key={id}><span className="service-icon">{icon}</span><div><h2>{name}</h2><p>{desc}</p></div><span className="pill">탐색하기</span></Link>:<div className="service-card" key={id}><span className="service-icon">{icon}</span><div><h2>{name}</h2><p>{desc}</p></div><span className="pill muted">준비 중</span></div>)}</section>}<nav className="sister-row" aria-label="함께 보면 좋은 정보"><a href={WEATHER}>🌤️ <b>여행지 날씨</b></a><a href={TRAFFIC}>🛣️ <b>가는 길 교통상황</b></a><a href={CHARGE}>⚡ <b>전기차 충전소</b></a></nav><LocalSection eyebrow="WEEKEND PICKS" title="이번 주말, 가볼만한 행사" nearTitle="이번 주말, 내 주변 50km 행사" more={`${trip}/weekend`} nearMore={`${trip}/search?radius_km=50&kind=festival&when=weekend`} query={{kind:'festival',when:'weekend',limit:3}} nearQuery={{kind:'festival',when:'weekend',radius_km:50,limit:6}} base={trip}/><LocalSection eyebrow="PLACES TO GO" title="가까운 발견, 새로운 여행" nearTitle="조금 더 멀리, 50km 안 가볼만한곳" more={`${trip}/place`} nearMore={`${trip}/search?radius_km=50&kind=place`} items={places.items} query={{kind:'place',limit:6}} nearQuery={{kind:'place',radius_km:50,limit:6,page:3}} base={trip}/><AdSlot/><section className="section"><div className="section-heading"><div><div className="eyebrow">EXPLORE BY REGION</div><h2>지역별로 둘러보기</h2></div></div><RegionPicker items={regionData.items} base={trip}/></section><Connect title="여행 전에 함께 확인하세요" items={genericFor('trip')}/><section className="source-strip"><span>◇</span><div><strong>출처와 확인일을 함께 보여드립니다</strong><p>운영시간과 요금이 확인되지 않은 정보는 ‘확인 필요’로 표시합니다.</p></div><Link href="/data-policy">데이터 안내</Link></section></>;
}

async function listing(service:Service,segments:string[]){
  const route=segments[0];const trip=service==='home'?origin('trip'):'';
  const regions=await api<{items:Region[]}>('/v1/regions');
  if(route==='region'&&!segments[1])return <section className="section"><div className="eyebrow">REGIONS</div><h1>어느 지역으로 떠나볼까요?</h1><div className="region-links">{regions.items.map(r=><Link href={`${trip}/region/${r.id}`} key={r.id}><strong>{r.name}</strong><span>{Number(r.count).toLocaleString()}개 정보</span></Link>)}</div></section>;
  if(route==='region'&&!regions.items.some(r=>r.id===segments[1]))notFound();
  const fixed:Query={};
  if(route==='region')fixed.region=segments[1];
  if(KINDS.includes(route))fixed.kind=route;
  if(['today','weekend'].includes(route))fixed.when=route;
  if(route in labels)fixed.condition=route;
  const region=regions.items.find(r=>r.id===fixed.region);
  const title=region?`${region.name} 여행`:collections[route]||(KIND[route]?`${KIND[route].label} 찾기`:'')||'여행 검색';
  // 맛집·숙소 would crowd region and condition lists: those start with 가볼만한곳·축제, chips switch (search shows all).
  const kinds=[{value:'place,festival',label:'가볼만한곳·축제'},...EXTRA_KINDS.filter(k=>count(`kind:${k}`)).map(k=>({value:k,label:`${KIND[k].icon} ${KIND[k].label}`})),{value:'',label:'전체'}];
  const defaults:Query=!fixed.kind&&(fixed.region||fixed.condition)&&kinds.length>2?{kind:'place,festival'}:{};
  // Query-string filters (?q=, ?region=, ?page=) are applied in the browser: the site is static.
  // Static HTML carries the first results so search engines (Naver Yeti renders little JS) see real content;
  // the browser then swaps in the interactive list with query-string filters and paging.
  const initial=search(places(),{...defaults,...fixed,limit:24});
  // The build file holds only the first cards of each list; the real total comes from its counts.
  const total=(fixed.region?count(`region:${fixed.region}${defaults.kind?':pf':''}`):fixed.kind?count(`kind:${fixed.kind}`):fixed.condition?count(`condition:${fixed.condition}`):fixed.when?undefined:count('all'))??initial.total;
  const fallback=<section className="section listing"><div className="eyebrow">FIND YOUR TRIP</div><h1>{title}</h1><div className="results-heading"><p><strong>{Number(total).toLocaleString()}</strong>개 정보</p></div><Cards items={initial.items}/></section>;
  // Region pages link to that area on the other sites (centre of its places); other lists get the network links.
  const pts=initial.items.map(p=>[Number(p.latitude),Number(p.longitude)]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b));
  const links=region&&pts.length?linksNear(pts.reduce((n,p)=>n+p[0],0)/pts.length,pts.reduce((n,p)=>n+p[1],0)/pts.length,'trip')
    :route==='weekend'||route==='today'?[GENERIC.weather,GENERIC.traffic,GENERIC.charge]:route==='indoor'?[{icon:'😷',title:'오늘 미세먼지',desc:'나쁜 날엔 실내 여행지로',href:`${WEATHER}/air`},GENERIC.weather,GENERIC.traffic]:genericFor('trip');
  // Region pages answer the questions people ask about the area in plain sentences (AEO), from the build file.
  const names=(kind:string)=>initial.items.filter(p=>p.kind===kind).slice(0,5).map(p=>p.name);
  const fest=initial.items.filter(p=>p.kind==='festival').slice(0,3).map(p=>`${p.name}(${p.start_date}~${p.end_date})`);
  const faq:QA[]=region?[[`${region.name} 가볼만한곳은 어디인가요?`,`내근처 여행에 등록된 ${region.name}의 가볼만한곳·축제는 ${Number(total).toLocaleString()}곳입니다.${names('place').length?` 정보가 충실한 곳으로 ${names('place').join(', ')} 등이 있습니다.`:''}`],
    [`${region.name}에서 열리는 축제·행사는 무엇인가요?`,fest.length?`진행 중이거나 열릴 예정인 행사로 ${fest.join(', ')} 등이 있습니다. 이번 주말 행사는 이번 주말 목록에서 확인하세요.`:`${region.name}의 축제·행사는 위 목록의 축제 카드에서, 이번 주말에 열리는 행사는 이번 주말 행사 목록에서 확인할 수 있습니다.`],
    [`${region.name} 여행 정보는 믿을 수 있나요?`,'한국관광공사 TourAPI 공식 관광정보를 6시간마다 자동으로 받아 갱신합니다. 운영시간·요금은 바뀔 수 있으니 방문 전 공식 안내를 확인하세요.']]:[];
  const crumbs=region?breadcrumbLd([['내근처 여행',origin('trip')+'/'],['지역별 여행',origin('trip')+'/region'],[region.name,`${origin('trip')}/region/${region.id}`]]):null;
  return <><Suspense fallback={fallback}><Listing fixed={fixed} regions={regions.items} title={title} defaults={defaults} kinds={kinds.length>2?kinds:[]}/></Suspense><Connect title={region?`${region.name} 여행 전에 확인하세요`:'함께 보면 좋은 정보'} items={links}/>{region&&<Faq title={`${region.name} 여행 자주 묻는 질문`} items={faq}/>}{crumbs&&<JsonLd data={crumbs}/>}</>;
}

async function detail(service:Service,segments:string[]){
  let place:Place;try{place=await api<Place>(`/v1/places/${encodeURIComponent(segments[1])}`);}catch(e){if(e instanceof Error&&e.message.includes('(404)'))notFound();throw e;}
  if(segments[0]!==place.kind)notFound();
  const query=new URLSearchParams({lat:String(place.latitude),lon:String(place.longitude),radius_km:'20',limit:'4'});
  const nearby=await api<Results>(`/v1/search?${query}`);
  return <DetailView place={place} nearby={[{kind:'place',items:nearby.items}]}/>;
}

export async function Page({service,segments=[]}:{service:Service;segments?:string[]}){
  const route=segments[0];
  if(!route)return landing(service);
  if(['about','data-policy','privacy'].includes(route)&&segments.length===1){
    const copy:Record<string,[string,string[]]>={about:['내근처 여행 소개',['내근처 여행은 지역과 날짜를 중심으로 가볼만한곳과 축제·행사를 찾는 여행 서비스입니다.','한국관광공사 공식 관광정보를 바탕으로 여행지와 행사 정보를 제공합니다.']], 'data-policy':['데이터·출처 안내',['내근처 여행은 한국관광공사 TourAPI와 공식 공공데이터를 대상으로 수집·정규화·검증 후 제공합니다. 샘플 모드의 정보는 실제 방문정보로 사용하지 마세요.','무료·아이 동반·반려동물·실내 조건은 근거가 있는 경우에만 분류합니다. 근거는 검수자가 확인한 출처이거나, 한국관광공사 원천 정보의 요금·이용연령·반려동물 동반·시설 분류에서 자동으로 판단한 것(‘원천 자동 분류’로 표시)입니다. 무료는 기본 입장·이용요금 기준이며 주차·체험 비용은 별도일 수 있습니다. 확인되지 않은 값은 확인 필요로 표시합니다.','수집 시각과 내용 확인일을 구분합니다. 요금과 운영시간은 변경될 수 있으므로 방문 전 공식 제공기관의 안내를 확인하세요.','이미지는 사용권과 출처를 확인한 자료만 공개합니다.']],privacy:['개인정보 안내',['회원가입 없이 지역과 장소를 검색할 수 있습니다. 첫 화면의 "내 주변" 정보는 접속한 인터넷 주소(IP)로 추정한 대략적인 도시(Cloudflare 제공)를 기준으로 보여 주며, 정확한 위치는 "내 위치" 카드를 누르고 브라우저 위치 권한을 허용한 경우에만 사용합니다. 한 번 허용하면 다음 방문부터 다시 묻지 않고 사용합니다.','위치는 주변 검색 요청(좌표)을 처리하는 용도로만 쓰고, 브라우저 안에 30분 동안만 보관합니다. 서버에 위치 이력이나 사용자 프로필을 저장하지 않습니다. 외부 지도 링크를 열면 해당 서비스의 정책이 적용됩니다.','이 사이트는 Google AdSense 광고를 게재합니다. Google 등 제3자 광고 사업자는 쿠키를 사용해 이 사이트와 다른 사이트 방문 기록을 바탕으로 광고를 제공할 수 있습니다. 맞춤 광고는 Google 광고 설정(adssettings.google.com)에서 해제할 수 있습니다.','방문 통계를 위해 Google Analytics를 사용합니다. Google Analytics는 쿠키로 방문 페이지·이용 시간·기기 종류 같은 이용 정보를 익명 통계로 수집하며, Google 개인정보처리방침(policies.google.com/privacy)에 따라 처리됩니다. 브라우저 설정이나 Google 애널리틱스 차단 부가기능(tools.google.com/dlpage/gaoptout)으로 수집을 거부할 수 있습니다.','서비스 개선을 위해 Microsoft Clarity를 사용합니다. Clarity는 쿠키 등을 이용해 클릭·스크롤 같은 이용 행태와 화면 이용 기록을 익명으로 수집하며, 입력한 개인정보는 수집 대상에서 가려집니다. 수집된 정보는 Microsoft 개인정보처리방침(privacy.microsoft.com)에 따라 처리됩니다.','운영 서버의 접속 로그 보관기간과 담당자 정보는 실제 배포 전에 확정해 고지합니다.']]};const [title,paras]=copy[route];return <article className="section prose"><div className="eyebrow">GUIDEJUNG DATA</div><h1>{title}</h1>{paras.map(p=><p key={p}>{p}</p>)}</article>;
  }
  if(service==='home'&&!['search','region'].includes(route))notFound();
  if(KINDS.includes(route)&&segments.length===2)return detail(service,segments);
  if(['search','region',...KINDS,...Object.keys(collections)].includes(route)&&segments.length<3)return listing(service,segments);
  notFound();
}

// 맛집·숙소 lists are indexed once the data has them.
const INDEXED_LISTS=['region','place','festival','free','kids','pet','indoor',...EXTRA_KINDS.filter(k=>count(`kind:${k}`))];
export async function pageMetadata(service:Service,segments:string[]):Promise<Metadata>{
  const path='/'+segments.join('/');let description=TRIP_DESC;let title=service==='home'?'GuideJung | 지역 기반 생활정보':'내근처 여행 | 오늘 어디가? 내 주변 가볼만한곳·맛집·숙소';let index=false;
  if(KINDS.includes(segments[0])&&segments[1]){try{const p=await api<Place>(`/v1/places/${encodeURIComponent(segments[1])}`);title=`${p.name} | 내근처 여행`;index=p.indexable&&!p.is_demo;description=placeDescription(p);}catch{}}
  else if(!segments.length)index=enabled();
  else if(INDEXED_LISTS.includes(segments[0])&&segments.length<=2){
    // 지역·조건별 목록은 검색 유입 입구라 노출한다. 결과가 매번 바뀌는 검색(/search)과 날짜 기반(오늘·이번 주말) 목록은 제외.
    let name:string|undefined;
    if(segments[0]==='region'&&segments[1]){try{name=(await api<{items:Region[]}>('/v1/regions')).items.find(r=>r.id===segments[1])?.name;}catch{}}
    if(segments[0]!=='region'||!segments[1]||name){
      const head=segments[0]==='region'?(name?`${name} 가볼만한곳·축제`:'지역별 여행지 찾기'):KIND[segments[0]]?`전국 ${KIND[segments[0]].label}`:collections[segments[0]];
      title=`${head} | 내근처 여행`;index=enabled();
      description=segments[0]==='region'&&name?`${name}의 가볼만한곳과 축제·행사를 한국관광공사 공식 정보로 확인하세요. 운영시간·요금·주차 정보 제공.`:`${head} 목록을 지역과 조건으로 찾아보세요. 한국관광공사 공식 관광정보 기반.`;
    }
  }
  return {title,description,alternates:{canonical:origin(service)+path,types:{'application/rss+xml':origin(service)+'/rss.xml'}},robots:{index,follow:true},twitter:{card:'summary_large_image'},openGraph:{images:origin(service)+'/og.png',title,description,url:origin(service)+path,siteName:'내근처 여행',locale:'ko_KR',type:'website'}};
}
export async function siteMap(service:Service){
  if(!enabled())return [];
  let status:Status;try{status=await api<Status>('/v1/status');}catch{return [];}
  if(status.mode!=='live'||!status.available)return [];
  const rows=service==='trip'?(await api<{items:{path:string;lastmod:string}[]}>('/v1/sitemap')).items:[];
  const at=status.updated_at?new Date(status.updated_at):undefined;
  const lists=service==='trip'?[...INDEXED_LISTS.map(k=>'/'+k),...(await api<{items:Region[]}>('/v1/regions')).items.map(r=>`/region/${r.id}`)]:[];
  return [{url:origin(service)+'/',lastModified:at},...lists.map(path=>({url:origin(service)+path,lastModified:at})),...rows.map(p=>({url:origin(service)+p.path,lastModified:new Date(p.lastmod)}))];
}
export const rss=(service:Service)=>rssXml(places(),origin(service));
/** Every page the static build emits. Place/festival detail pages are not here: the trip Worker renders them from D1. */
export async function staticSegments(){
  const regions=(await api<{items:Region[]}>('/v1/regions')).items;
  return [[],['search'],['region'],...KINDS.map(k=>[k]),...Object.keys(collections).map(k=>[k]),['about'],['data-policy'],['privacy'],
    ...regions.map(r=>['region',r.id])];
}
