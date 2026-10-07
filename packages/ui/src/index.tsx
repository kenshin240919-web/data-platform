import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {Suspense} from 'react';
import type {Place,Region,Results,Service,Status} from './types';
import {api,enabled,origin,places} from './server';
import {Nearby} from './controls';
import {Cards,SearchForm,collections,detailPath,formatDate,labels} from './cards';
import {ClientCards,EventNote,Listing} from './listing';
import type {Query} from './search';
export {searchIndex} from './server';

const services=[['trip','여행','축제 · 행사 · 가볼만한곳','✳'],['traffic','교통','도로 · CCTV · 교통상황','↗'],['academy','교육','학원 · 교습소 · 수강료','▤'],['charge','전기차','충전소 · 사용가능 충전기','ϟ'],['weather','날씨','지역 · 여행 · 생활날씨','◌']];
function safeUrl(input:string){try{const u=new URL(input);return ['https:','http:'].includes(u.protocol)?u.href:'#';}catch{return '#';}}

export async function Shell({children,service}:{children:React.ReactNode;service:Service}){
  let status:Status|null=null;try{status=await api<Status>('/v1/status');}catch{}
  const trip=service==='home'?origin('trip'):'';
  return <><header className="header"><div className="header-inner"><Link href="/" className="brand"><span className="brand-car" aria-hidden="true">🚗</span><span>여행정보</span></Link><nav aria-label="주요 메뉴"><Link href="/">여행 홈</Link><Link href="/place">가볼만한곳</Link><Link href="/festival">축제·행사</Link><Link href={`${trip}/weekend`}>이번 주말</Link><Link href={`${trip}/region`}>지역별 여행</Link></nav><span className="header-note">오늘을 위한 정보</span></div></header>{status?.mode==='demo'&&<div className="demo-banner" role="status"><strong>샘플 미리보기</strong><span>장소 조건과 행사 일정은 기능 확인용 예시입니다. 실제 방문정보가 아닙니다.</span></div>}{!status&&<div className="demo-banner error">데이터 서버에 연결하지 못했습니다. 잠시 후 다시 확인하세요.</div>}<main>{children}</main><footer><div><Link href="/" className="footer-brand">🚗 여행정보</Link><p>지역과 날짜로 찾는 여행지·축제 정보</p></div><div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link></div><p className="muted small">© {new Date().getFullYear()} GuideJung Data · 정보는 제공기관의 발표 이후 변경될 수 있습니다.</p></footer></>;
}


async function landing(service:Service){
  const [regionData,status,places]=await Promise.all([api<{items:Region[]}>('/v1/regions'),api<Status>('/v1/status'),api<Results>('/v1/search?kind=place&limit=6')]);
  const trip=service==='home'?origin('trip'):'';
  return <><section className={`hero ${service}`}><div className="hero-body"><div className="eyebrow">{service==='home'?'GUIDEJUNG · EVERYDAY DISCOVERY':'GUIDEJUNG TRIP · 대한민국 여행 찾기'}</div><h1>{service==='home'?<>필요한 정보를<br/>바로 찾아보세요<span>.</span></>:<>오늘, 어디로<br/>떠나볼까요<span>?</span></>}</h1><p>{service==='home'?'여행부터 생활정보까지, 지역을 중심으로 한곳에서.':'가볼만한곳과 축제, 내게 맞는 주말을 찾아보세요.'}</p><SearchForm regions={regionData.items} target={`${trip}/search`}/><div className="quick-links"><span>이런 여행은 어때요</span>{Object.entries(labels).map(([key,label])=><Link key={key} href={`${trip}/${key}`}>{label}</Link>)}</div></div><aside className="hero-aside"><div className="aside-label">YOUR NEXT DISCOVERY</div><div className="big-symbol" aria-hidden="true">⌖</div><h2>지역에서 시작하는<br/>새로운 발견</h2><div className="aside-stats"><div><strong>{status.place_count}</strong><span>{status.mode==='demo'?'샘플 장소':'공개 장소'}</span></div><div><strong>{regionData.items.length}</strong><span>탐색 가능한 지역</span></div></div></aside></section>{service==='home'&&<section className="service-grid" aria-label="GuideJung 서비스">{services.map(([id,name,desc,icon])=>id==='trip'?<Link className="service-card ready" href={origin('trip')} key={id}><span className="service-icon">{icon}</span><div><h2>{name}</h2><p>{desc}</p></div><span className="pill">탐색하기</span></Link>:<div className="service-card" key={id}><span className="service-icon">{icon}</span><div><h2>{name}</h2><p>{desc}</p></div><span className="pill muted">준비 중</span></div>)}</section>}<section className="section"><div className="section-heading"><div><div className="eyebrow">WEEKEND PICKS</div><h2>이번 주말, 가볼만한 행사</h2></div><Link href={`${trip}/weekend`}>행사 모두 보기</Link></div><ClientCards query={{kind:'festival',when:'weekend',limit:3}} base={trip}/></section><section className="section"><div className="section-heading"><div><div className="eyebrow">EXPLORE BY REGION</div><h2>지역별로 둘러보기</h2></div><Nearby base={trip}/></div><div className="region-links">{regionData.items.map((r,i)=><Link href={`${trip}/region/${r.id}`} key={r.id}><span className="region-number">0{i+1}</span><strong>{r.name.split(' ').slice(-1)}</strong><span>{r.count}개 정보</span></Link>)}</div></section><section className="section"><div className="section-heading"><div><div className="eyebrow">PLACES TO GO</div><h2>가까운 발견, 새로운 여행</h2></div><Link href={`${trip}/place`}>장소 모두 보기</Link></div><Cards items={places.items} base={trip}/></section><section className="source-strip"><span>◇</span><div><strong>출처와 확인일을 함께 보여드립니다</strong><p>운영시간과 요금이 확인되지 않은 정보는 ‘확인 필요’로 표시합니다.</p></div><Link href="/data-policy">데이터 안내</Link></section></>;
}

async function listing(service:Service,segments:string[]){
  const route=segments[0];const trip=service==='home'?origin('trip'):'';
  const regions=await api<{items:Region[]}>('/v1/regions');
  if(route==='region'&&!segments[1])return <section className="section"><div className="eyebrow">REGIONS</div><h1>어느 지역으로 떠나볼까요?</h1><div className="region-links">{regions.items.map(r=><Link href={`${trip}/region/${r.id}`} key={r.id}><strong>{r.name}</strong><span>{r.count}개 정보</span></Link>)}</div></section>;
  if(route==='region'&&!regions.items.some(r=>r.id===segments[1]))notFound();
  const fixed:Query={};
  if(route==='region')fixed.region=segments[1];
  if(route==='place'||route==='festival')fixed.kind=route;
  if(['today','weekend'].includes(route))fixed.when=route;
  if(route in labels)fixed.condition=route;
  const region=regions.items.find(r=>r.id===fixed.region);
  const title=region?`${region.name} 여행`:collections[route]||(route==='festival'?'축제·행사 찾기':route==='place'?'가볼만한곳 찾기':'여행 검색');
  // Query-string filters (?q=, ?region=, ?page=) are applied in the browser: the site is static.
  return <Suspense fallback={<div className="loading" role="status">정보를 불러오고 있습니다.</div>}><Listing fixed={fixed} regions={regions.items} title={title}/></Suspense>;
}

async function detail(service:Service,segments:string[]){
  let place:Place;try{place=await api<Place>(`/v1/places/${encodeURIComponent(segments[1])}`);}catch(e){if(e instanceof Error&&e.message.includes('(404)'))notFound();throw e;}
  if((segments[0]==='festival')!==(place.kind==='festival'))notFound();
  const query=new URLSearchParams({lat:String(place.latitude),lon:String(place.longitude),radius_km:'20',limit:'4'});
  const nearby=await api<Results>(`/v1/search?${query}`);
  const structured=place.indexable?{'@context':'https://schema.org','@type':place.kind==='festival'?'Event':'Place',name:place.name,description:place.description,...(place.kind==='festival'?{startDate:place.start_date,endDate:place.end_date,eventStatus:'https://schema.org/EventScheduled',location:{'@type':'Place',name:place.name,address:{'@type':'PostalAddress',streetAddress:place.address,addressCountry:'KR'}}}:{address:place.address,geo:{'@type':'GeoCoordinates',latitude:place.latitude,longitude:place.longitude}})}:null;
  return <section className="section detail"><nav className="breadcrumbs" aria-label="현재 위치"><Link href="/">여행</Link><span>/</span><Link href={`/region/${place.region_id}`}>{place.region_name}</Link><span>/</span><span>{place.kind==='festival'?'축제·행사':'가볼만한곳'}</span></nav><div className="detail-title"><div className="eyebrow">{place.kind==='festival'?'FESTIVAL':'PLACE'}</div><h1>{place.name}</h1><p>{place.address}</p><div className="tags">{Object.entries(place.conditions).filter(([,v])=>v===true).map(([k])=><span key={k}>{labels[k]}</span>)}</div></div><div className="detail-layout"><article className="detail-body">{place.images&&place.images.length>0&&<div className="photo-gallery">{place.images.slice(0,3).map(photo=><figure key={photo.url}><img src={photo.url} alt={photo.alt} loading="lazy"/><figcaption>{photo.credit} · 공공누리 {photo.license==='Type1'?'1':'3'}유형 · <a href={photo.source} target="_blank" rel="noopener noreferrer">출처</a></figcaption></figure>)}</div>}<h2>이곳은 어떤 곳인가요?</h2><p className="description">{place.description||'상세 소개를 확인하고 있습니다.'}</p>{place.start_date&&<div className="event-panel"><h3>행사 일정</h3><strong>{place.start_date} — {place.end_date}</strong><EventNote end={place.end_date} demo={place.is_demo}/></div>}<h2>방문 전 확인할 정보</h2><dl className="facts">{[['운영시간',place.hours],['휴무일',place.closed_days],['입장·이용요금',place.fee],['주차',place.parking],['주차요금',place.parking_fee],['수용인원',place.capacity],['이용연령 안내',place.age_guide],['주최·주관',place.organizer],['문의',place.phone],['주소',place.address],['마지막 내용 확인',place.verified_at?formatDate(place.verified_at):null]].map(([label,val])=><div key={label}><dt>{label}</dt><dd>{val||'확인 필요'}</dd></div>)}</dl>{place.official_url&&<p><a className="text-link" href={safeUrl(place.official_url)} target="_blank" rel="noopener noreferrer">공식 홈페이지에서 확인하기 ↗</a></p>}{place.facilities&&place.facilities.length>0&&<><h2>시설·이용 안내</h2><dl className="facts">{place.facilities.map((facility,i)=><div key={i}><dt>{facility.name}</dt><dd>{facility.description}</dd></div>)}</dl></>}{place.pet_policy&&Object.keys(place.pet_policy).length>0&&<><h2>반려동물 동반 안내</h2><dl className="facts">{Object.entries(place.pet_policy).map(([key,text])=><div key={key}><dt>{{acmpyTypeCd:'동반 유형',acmpyPsblCpam:'동반 가능한 동물',acmpyNeedMtr:'준비사항',etcAcmpyInfo:'추가 안내',relaAcdntRiskMtr:'주의사항',relaPosesFclty:'관련 시설',relaFrnshPrdlst:'비치 물품',relaPurcPrdlst:'구매 물품',relaRntlPrdlst:'대여 물품'}[key]||'동반 안내'}</dt><dd>{text}</dd></div>)}</dl></>}<h2>여행 조건</h2><dl className="facts">{Object.entries(labels).map(([key,label])=><div key={key}><dt>{label}</dt><dd>{place.conditions[key]===true?'해당':place.conditions[key]===false?'해당하지 않음':'확인 필요'}{place.evidence[key]&&<small>{place.evidence[key].source} · {place.evidence[key].verified_at}</small>}</dd></div>)}</dl></article><aside className="detail-aside"><div className="location-panel"><span className="location-symbol">⌖</span><h2>{place.region_name}</h2><p>{place.address}</p><p className="muted small">위도 {place.latitude} · 경도 {place.longitude}</p><a className="button" href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`} target="_blank" rel="noopener noreferrer">지도에서 위치 보기</a><Link className="text-link" href={`/region/${place.region_id}`}>같은 지역 둘러보기</Link></div><div className="provenance"><h3>데이터 출처</h3><p>{place.is_demo?'개발 샘플 데이터':'한국관광공사 · 공식 데이터'}</p><a href={safeUrl(place.source_url)} target="_blank" rel="noopener noreferrer">원천 데이터 안내</a><p className="muted small">수집 버전 공개: {formatDate(place.updated_at)}</p><p className="muted small">{place.is_demo?'샘플은 실제 방문정보가 아닙니다.':'수집시각과 내용 확인일은 다릅니다.'}</p></div></aside></div><div className="section-heading"><h2>주변에서 함께 둘러볼 곳</h2><span className="muted small">반경 20km · 직선거리 기준</span></div><Cards items={nearby.items.filter(p=>p.id!==place.id)}/>{structured&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,'\\u003c')}}/>}</section>;
}

export async function Page({service,segments=[]}:{service:Service;segments?:string[]}){
  const route=segments[0];
  if(!route)return landing(service);
  if(['about','data-policy','privacy'].includes(route)&&segments.length===1){
    const copy:Record<string,[string,string[]]>={about:['여행정보 서비스',['여행정보는 지역과 날짜를 중심으로 가볼만한곳과 축제·행사를 찾는 여행 서비스입니다.','한국관광공사 공식 관광정보를 바탕으로 여행지와 행사 정보를 제공합니다.']], 'data-policy':['데이터·출처 안내',['여행정보는 한국관광공사 TourAPI와 공식 공공데이터를 대상으로 수집·정규화·검증 후 제공합니다. 샘플 모드의 정보는 실제 방문정보로 사용하지 마세요.','무료·아이 동반·반려동물·실내 조건은 근거가 확인된 경우에만 분류합니다. 무료는 기본 입장·이용요금 기준이며 주차·체험 비용은 별도일 수 있습니다. 확인되지 않은 값은 확인 필요로 표시합니다.','수집 시각과 내용 확인일을 구분합니다. 요금과 운영시간은 변경될 수 있으므로 방문 전 공식 제공기관의 안내를 확인하세요.','이미지는 사용권과 출처를 확인한 자료만 공개합니다.']],privacy:['개인정보 안내',['회원가입 없이 지역과 장소를 검색할 수 있습니다. 위치 기반 검색은 사용자가 버튼을 누르고 위치 권한을 허용한 경우에만 작동합니다.','위치는 주변 검색 요청을 처리하는 용도로 사용하며 이 버전에서는 별도 위치 이력이나 사용자 프로필을 저장하지 않습니다. 외부 지도 링크를 열면 해당 서비스의 정책이 적용됩니다.','이 버전에는 광고·Analytics 추적 코드를 넣지 않았습니다. 운영 서버의 접속 로그 보관기간과 담당자 정보는 실제 배포 전에 확정해 고지합니다.']]};const [title,paras]=copy[route];return <article className="section prose"><div className="eyebrow">GUIDEJUNG DATA</div><h1>{title}</h1>{paras.map(p=><p key={p}>{p}</p>)}</article>;
  }
  if(service==='home'&&!['search','region'].includes(route))notFound();
  if(['place','festival'].includes(route)&&segments.length===2)return detail(service,segments);
  if(['search','region','place','festival',...Object.keys(collections)].includes(route)&&segments.length<3)return listing(service,segments);
  notFound();
}

export async function pageMetadata(service:Service,segments:string[]):Promise<Metadata>{
  const path='/'+segments.join('/');let title=service==='home'?'GuideJung | 지역 기반 생활정보':'GuideJung 여행 | 오늘과 이번 주말 가볼만한곳';let index=false;
  if(['place','festival'].includes(segments[0])&&segments[1]){try{const p=await api<Place>(`/v1/places/${encodeURIComponent(segments[1])}`);title=`${p.name} | GuideJung 여행`;index=p.indexable&&!p.is_demo;}catch{}}
  else if(!segments.length)index=enabled();
  return {title,description:'지역과 날짜로 가볼만한곳·축제·생활정보를 찾아보세요.',alternates:{canonical:origin(service)+path},robots:{index,follow:true},openGraph:{title,url:origin(service)+path,siteName:'GuideJung',locale:'ko_KR',type:'website'}};
}
export async function siteMap(service:Service){
  if(!enabled())return [];
  let status:Status;try{status=await api<Status>('/v1/status');}catch{return [];}
  if(status.mode!=='live'||!status.available)return [];
  const rows=service==='trip'?(await api<{items:{path:string;lastmod:string}[]}>('/v1/sitemap')).items:[];
  return [{url:origin(service)+'/',lastModified:status.updated_at?new Date(status.updated_at):undefined},...rows.map(p=>({url:origin(service)+p.path,lastModified:new Date(p.lastmod)}))];
}
export function robots(service:Service){return {rules:{userAgent:'*',allow:'/',disallow:['/api/','/admin']},sitemap:origin(service)+'/sitemap.xml'};}
/** Every page the static build emits; other URLs get the 404 page. */
export async function staticSegments(){
  const regions=(await api<{items:Region[]}>('/v1/regions')).items;
  return [[],['search'],['region'],['place'],['festival'],...Object.keys(collections).map(k=>[k]),['about'],['data-policy'],['privacy'],
    ...regions.map(r=>['region',r.id]),...places().map(p=>[p.kind,p.id])];
}
