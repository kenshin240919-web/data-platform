// Cloudflare Worker for service.guidejung.com (내근처 서비스센터). Static pages: ./out (Next.js export).
// The list ships with the Worker (data/centers.json, scripts/collect-service.py — repair shops, inspection stations, car washes,
// emission repair; no database), imported as text (wrangler.jsonc rules) and parsed on first use.
// Routes: /api/near, /api/search, /api/where, /api/status, 상세 /center/{id} (server-rendered into /center/shell),
// /sitemap.xml (index) → /sitemap-pages.xml (Next) + /sitemap-centers-{n}.xml (here, 40,000 each).
import raw from '../data/centers.json';
import weatherRegions from '../../weather/data/regions.json';
import {brand} from '../lib/brands';
import {centerPath,distKm,esc,eun,hoursLine,KIND_LABEL,KINDS,km,kstNow,mapUrl,n,openNow,REPAIR_INFO,SITE,slim,years,type Center,type Kind,type KindStats} from '../lib/fmt';
import {actionsHtml} from '../../../packages/ui/src/actions';

interface Env{ASSETS:Fetcher;KAKAO_REST_KEY?:string}
type Data={status:{updated_at:string;count:number};stats?:Record<string,Partial<Record<Kind,KindStats>>>;items:Center[]};
let parsed:Data|null=null,byId:Map<string,Center>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const get=(id:string)=>(byId??=new Map(data().items.map(p=>[p.id,p]))).get(id);
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();
const PER_SITEMAP=40000;
const SITEMAP_STAGE=1;  // 사이트맵에 넣는 단계(collect-service.py stage_of) — 구글 색인이 늘면 2, 3으로 올림

function near(lat:number,lon:number,radius:number,limit:number,kinds:Kind[]|null,skip?:string){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180));
  const out:(Center&{km:number})[]=[];
  for(const p of data().items){
    if(p.lat==null||p.id===skip||Math.abs(p.lat-lat)>dLat||Math.abs(p.lon!-lon)>dLon)continue;
    if(kinds&&!kinds.includes(p.kind))continue;
    const d=distKm(lat,lon,p.lat,p.lon!);if(d>radius)continue;
    out.push({...p,km:Math.round(d*100)/100});
  }
  out.sort((a,b)=>a.km-b.km);
  return {total:out.length,items:out.slice(0,limit)};
}

// 내 주변 브랜드 서비스센터: 카카오 로컬 키워드 검색을 요청마다 실시간으로 부름. 카카오 API 조건상 결과를 저장·캐시하지 않음(no-store).
async function brandNear(env:Env,slug:string,lat:number,lon:number){
  const b=brand(slug);if(!b?.near||!env.KAKAO_REST_KEY)return null;
  if(lat<33||lat>39||lon<124||lon>132)return {items:[]};
  const q=new URLSearchParams({query:b.near.query,x:lon.toFixed(5),y:lat.toFixed(5),radius:'20000',sort:'distance',size:'15'});
  const r=await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${q}`,{headers:{Authorization:`KakaoAK ${env.KAKAO_REST_KEY}`}});
  if(!r.ok)throw new Error(`kakao ${r.status}`);
  const d=await r.json() as {documents:{place_name:string;category_name:string;road_address_name:string;address_name:string;phone:string;distance:string;place_url:string}[]};
  const n=b.near;
  const items=d.documents.filter(p=>(!n.category||p.category_name.split(' > ').pop()===n.category)&&(!n.name||p.place_name.includes(n.name))&&(!n.exclude||!p.place_name.includes(n.exclude)))
    .map(p=>({name:p.place_name,addr:p.road_address_name||p.address_name||null,tel:p.phone||null,km:Math.round(+p.distance/10)/100,url:p.place_url}));
  return {items:items.slice(0,10)};
}

// ---- detail page ----------------------------------------------------------------------------------------------------
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/center/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});
type WR={code:string;name:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
function connectHtml(p:Center){
  if(p.lat==null||p.lon==null)return '';
  const r=WREG.reduce((x,y)=>distKm(p.lat!,p.lon!,y.lat,y.lon)<distKm(p.lat!,p.lon!,x.lat,x.lon)?y:x);
  const items:[string,string,string,string][]=[
    ['🅿️','근처 주차장','기다리는 동안 세울 곳·요금','https://parking.guidejung.com/'],
    ['⛽','근처 싼 주유소','오늘 휘발유·경유 최저가','https://oil.guidejung.com/'],
    ['⚡','근처 전기차 충전소','지금 충전 가능한 곳',`https://charge.guidejung.com/region/${r.name.includes(' ')?r.code.slice(0,4)+'0':r.code}`],
    ['🍽️','기다리는 동안 근처 맛집','1km 안 맛집·카페',`https://trip.guidejung.com/search?lat=${p.lat.toFixed(4)}&lon=${p.lon.toFixed(4)}&radius_km=1&kind=food`],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,h])=>`<a href="${esc(h)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const cardHtml=(c:Center&{km:number})=>`<a class="sv-card" href="${centerPath(c.id)}"><span class="sv-kind" aria-hidden="true">${KINDS[c.kind].icon}</span><span class="sv-card-body"><b>${esc(c.name)}</b><small>${esc(km(c.km))}${c.sub?` · ${esc(c.sub)}`:''}</small><small class="muted">${esc(c.addr??c.jibun??'')}</small></span></a>`;
const hhmm=(m:number)=>`${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const mm=(s:string)=>+s.slice(0,2)*60+ +s.slice(3,5);
const rank=(v:number,lo?:number,hi?:number,up='',down='')=>lo==null||hi==null||hi<=lo?'':v>=hi?up:v<=lo?down:'';

/** 이 곳만의 내용(구글이 거의 같은 틀 페이지로 보지 않게): 등록 연차·평일 마감을 같은 지역 같은 종류와 비교, 1km 안 정비소·세차장,
 *  가까운 검사소·공영주차장 — collect-service.py enrich·region_stats 결과로. */
function insight(p:Center){
  const st=data().stats?.[p.region]?.[p.kind],K=KINDS[p.kind],label=p.kind==='repair'?'정비소':K.label,y=years(p.since);
  const year=p.since&&/^\d{4}/.test(p.since)?+p.since.slice(0,4):null,thisYear=+kstNow().ymd.slice(0,4),ok=(st?.n??0)>=8;
  const where=`${p.region_name} ${label} ${n(st?.n??0)}곳`;
  const age=year&&ok?rank(-year,-(st!.y75??0),-(st!.y25??0),'오래된 편(상위 25%)','최근에 생긴 편')||(st!.y25?'중간쯤':''):'';
  const wk=p.hours.wk,close=wk?mm(wk[1]):null;
  const late=close!=null&&ok&&st!.hours>=8?rank(close,st!.c25,st!.c75,'늦게까지 하는 편(상위 25%)','일찍 닫는 편(하위 25%)')||'보통 시간에 닫는 곳':'';
  const ins=p.insp&&p.kind!=='inspect'?get(p.insp.id):undefined,a=p.around,park=p.park;
  const wait=p.kind==='repair'||p.kind==='emission'?'정비를 맡기는 동안':'기다리는 동안';
  const lines:string[]=[],faq:[string,string][]=[],desc:string[]=[];
  if(y){lines.push(`${year}년에 등록해 <b>${y}년째</b> 영업 중이에요${age?`. ${esc(where)} 가운데 <b>${age}</b>이에요`:''}.`);
    faq.push([`${p.name}, 몇 년 된 곳인가요?`,`${p.since}에 등록해 ${y}년째예요.${age?` ${where} 가운데 ${age}이에요.`:''}`]);desc.push(`${y}년째`);}
  if(late)lines.push(`평일에는 ${esc(wk![1])}에 닫아 같은 지역 ${esc(label)} 가운데 <b>${late}</b>이에요.`);
  if(a){const what=`${p.kind==='repair'?'다른 ':''}정비소 ${n(a.r)}곳${a.r?`(종합·소형 ${n(a.b)}곳)`:''}${a.w?`, 세차장 ${n(a.w)}곳`:''}`;
    lines.push(a.r||a.w?`반경 1km 안에 ${what}이 있어요.`:`반경 1km 안에 다른 정비소·세차장이 없어요.`);
    faq.push([`${p.name} 주변에 정비소가 몇 곳 있나요?`,a.r||a.w?`반경 1km 안에 ${what}이 있어요.`:'반경 1km 안에는 다른 정비소·세차장이 없어요.']);if(a.r)desc.push(`1km 안 정비소 ${n(a.r)}곳`);}
  if(ins&&p.insp!.m<50){lines.push(`같은 자리에 민간 지정 검사소 <a href="${centerPath(ins.id)}">${esc(ins.name)}</a>가 있어 <b>정기·종합검사도</b> 받을 수 있어요.`);
    faq.push([`${p.name}에서 자동차 검사도 받을 수 있나요?`,`같은 자리에 지정 검사소 ${ins.name}가 등록돼 있어요. 받을 수 있는 검사 종류는 검사소 페이지에서 확인하세요.`]);desc.push('검사소 함께 있음');}
  else if(ins){lines.push(`가장 가까운 자동차 검사소는 <a href="${centerPath(ins.id)}">${esc(ins.name)}</a>(${km(p.insp!.m/1000)})예요.`);
    faq.push([`${p.name} 근처 자동차 검사소는 어디인가요?`,`가장 가까운 검사소는 ${ins.name}(${km(p.insp!.m/1000)})예요${ins.addr?` — ${ins.addr}`:''}.`]);desc.push(`가까운 검사소 ${ins.name} ${km(p.insp!.m/1000)}`);}
  if(park){lines.push(`${wait} ${km(park.m/1000)} 거리 공영주차장 <a href="https://parking.guidejung.com/parking/${encodeURIComponent(park.id)}">${esc(park.name)}</a>(${park.free?'무료':'유료'})에 세울 수 있어요.`);
    faq.push([`${p.name} 근처에 차를 세울 곳이 있나요?`,`${km(park.m/1000)} 거리에 공영주차장 ${park.name}(${park.free?'무료':'유료'})이 있어요.`]);}
  if(Object.keys(p.hours).length)faq.push([`${p.name}, 토요일·일요일에도 하나요?`,
    `${p.hours.sat?`토요일 ${p.hours.sat[0]}~${p.hours.sat[1]}`:'토요일 시간 정보 없음'}, ${p.hours.hol?`일요일·공휴일 ${p.hours.hol[0]}~${p.hours.hol[1]}`:'일요일·공휴일 시간 정보 없음'}으로 등록돼 있어요(지자체 등록 기준). 가기 전에 전화로 확인하세요.`]);
  const rows:[string,string,string][]=[];
  if(st){
    if(y&&st.y50)rows.push(['등록 연차',`${y}년째`,`중앙값 ${thisYear-st.y50}년째`]);
    if(wk&&st.c50!=null)rows.push(['평일 마감',wk[1],`중앙값 ${hhmm(st.c50)} (시간 등록 ${n(st.hours)}곳)`]);
    if(p.hours.sat||st.sat)rows.push(['토요일 영업',p.hours.sat?`${p.hours.sat[0]}~${p.hours.sat[1]}`:'정보 없음',`${n(st.sat)}곳 등록`]);
    if(p.hours.hol||st.hol)rows.push(['일요일·공휴일',p.hours.hol?`${p.hours.hol[0]}~${p.hours.hol[1]}`:'정보 없음',`${n(st.hol)}곳 등록`]);
    if(p.kind==='repair'&&st.big!=null)rows.push(['정비 종류',p.sub??'정보 없음',`종합·소형 ${n(st.big)}곳 · 전문 등 ${n(st.n-st.big)}곳`]);
  }
  const top=lines.length?`<section class="sv-insight"><h2>🔎 한눈에 보기</h2>${lines.map(l=>`<p>${l}</p>`).join('')}</section>`:'';
  const cmp=rows.length>=2?`<section><h2>📊 이 동네와 비교하면</h2><table class="sv-hours" style="max-width:none"><thead><tr><th></th><th>이곳</th><th>${esc(where)}</th></tr></thead><tbody>${rows.map(([k,x,r])=>`<tr><th>${esc(k)}</th><td>${esc(x)}</td><td>${esc(r)}</td></tr>`).join('')}</tbody></table><p class="muted small">지자체에 등록된 정보 기준이에요. 영업 시간이 등록되지 않은 곳이 많아요.</p></section>`:'';
  return {top,cmp,faq,desc};
}
const DAY_LD={wk:['Monday','Tuesday','Wednesday','Thursday','Friday'],sat:['Saturday'],hol:['Sunday','PublicHolidays']} as const;

function detailHtml(p:Center,groups:[string,(Center&{km:number})[]][],I:ReturnType<typeof insight>){
  const now=kstNow(),o=openNow(p,now),addr=p.addr??p.jibun,K=KINDS[p.kind],y=years(p.since);
  const subInfo=p.kind==='repair'&&p.sub?REPAIR_INFO[p.sub]:null;
  const faq:[string,string][]=([
    [`${eun(p.name)} 어디에 있나요?`,addr?`${addr}에 있습니다${p.tel?`(전화 ${p.tel})`:''}.`:''],
    [`${p.name} 영업 시간은?`,p.hours_text??(hoursLine(p)!=='운영 시간 정보 없음'?`${hoursLine(p)}입니다(지자체 등록 기준).`:'등록된 영업 시간이 없습니다. 가기 전에 전화로 확인하세요.')],
    [`${eun(p.name)} 어떤 곳인가요?`,p.kind==='repair'?`${p.sub?`${p.sub}업체로, ${subInfo??''}`:'자동차 정비업체'}입니다${y?`(등록 ${y}년째)`:''}.`:p.kind==='inspect'?`${p.sub??''} 자동차 검사소로, ${p.tags.join('·')||'정기검사'}를 합니다.`:p.kind==='wash'?`세차장${p.sub?`(${p.sub})`:''}입니다${p.fee?` — 요금: ${p.fee}`:''}.`:`${p.sub??'배출가스 정비'} 업체입니다.`],
    ...I.faq,
  ] as [string,string][]).filter(([,x])=>x);
  const spec=(Object.keys(DAY_LD) as (keyof typeof DAY_LD)[]).filter(k=>p.hours[k]).map(k=>({'@type':'OpeningHoursSpecification',dayOfWeek:DAY_LD[k].map(d=>`https://schema.org/${d}`),opens:p.hours[k]![0],closes:p.hours[k]![1]==='24:00'?'23:59':p.hours[k]![1]}));
  const [sido,...rest]=p.region_name.split(' ');
  const ld={'@context':'https://schema.org','@type':K.ld,name:p.name,url:SITE+centerPath(p.id),image:SITE+'/og.png?v=2',
    ...(addr?{address:{'@type':'PostalAddress',streetAddress:addr,addressLocality:rest.join(' ')||sido,addressRegion:sido,addressCountry:'KR'}}:{}),
    ...(p.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:p.lat,longitude:p.lon}}:{}),...(p.tel?{telephone:p.tel}:{}),...(spec.length?{openingHoursSpecification:spec}:{}),
    ...(p.since&&/^\d{4}-\d{2}-\d{2}$/.test(p.since)?{foundingDate:p.since}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 서비스센터',SITE+'/'],['지역별',SITE+'/region'],[p.region_name,`${SITE}/region/${p.region}`],[p.name,SITE+centerPath(p.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const facts:[string,string|null][]=[['구분',[K.title,p.sub].filter(Boolean).join(' · ')],['도로명 주소',p.addr],['지번 주소',p.jibun],['전화',p.tel],['영업 시간',p.hours_text??(hoursLine(p)==='운영 시간 정보 없음'?null:hoursLine(p))],
    ['휴무일',p.off],['세차 요금',p.fee],['검사 종류',p.kind==='inspect'?p.tags.join(' · '):null],['업태',p.kind==='emission'?p.tags.join(' · '):null],
    [p.kind==='emission'?'인허가일':'등록일',p.since?`${p.since}${y?` (${y}년째)`:''}`:null],['관리기관',p.org],['기준일',p.ref],['지역',p.region_name]];
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별</a> › <a href="/region/${esc(p.region)}">${esc(p.region_name)}</a> › ${esc(p.name)}</nav>
<div class="sv-head"><h1>${K.icon} ${esc(p.name)}</h1><p>${esc([p.region_name,K.title,p.sub].filter(Boolean).join(' · '))}</p></div>${actionsHtml()}
<p class="sv-answer ${o?(o.open?'open':'closed'):''}">${o?`<span class="sv-dot" aria-hidden="true"></span><b>${esc(o.label)}</b> <span class="muted">· ${esc(KIND_LABEL[now.kind])}</span>`:`<b>${esc(subInfo??K.desc)}</b>`}${addr?` <span class="muted">· ${esc(addr)}</span>`:''}</p>
<div class="sv-actions">${p.tel?`<a href="tel:${esc(p.tel.replace(/[^0-9]/g,''))}">📞 전화하기</a>`:''}<a class="${p.tel?'sub':''}" href="${esc(mapUrl(p))}" rel="noopener" target="_blank">🧭 길찾기</a>${p.kind==='inspect'?'<a class="sub" href="/inspection">🗓️ 과태료 계산기</a>':''}</div>
${I.top}
${p.kind==='inspect'&&p.tags.length?`<section><h2>이곳에서 받을 수 있는 검사</h2><div class="sv-tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></section>`:''}
${Object.keys(p.hours).length?`<section><h2>영업 시간</h2><table class="sv-hours"><tbody>${(['wk','sat','hol'] as const).map(k=>{const h=p.hours[k];return `<tr${k===now.kind?' class="today"':''}><th>${KIND_LABEL[k]}${k===now.kind?' (오늘)':''}</th><td>${h?`${esc(h[0])} ~ ${esc(h[1])}`:'<span class="muted">정보 없음</span>'}</td></tr>`;}).join('')}</tbody></table><p class="muted small">지자체에 등록된 시간이에요. 점심시간·임시 휴무는 다를 수 있어요.</p></section>`:`<p class="sv-note">등록된 영업 시간이 없어요. 가기 전에 ${p.tel?'전화로 ':''}확인하세요.</p>`}
${I.cmp}
${p.kind==='repair'||p.kind==='emission'?`<p class="sv-note">✅ 맡기기 전에 견적서를 받고, 두세 곳을 비교하고, 명세서를 보관하세요. <a href="/guide">체크리스트·정비소 고르는 법 →</a></p>`:''}
${groups.map(([title,list])=>list.length?`<section><h2>${esc(title)}</h2><div class="sv-cards">${list.map(cardHtml).join('')}</div></section>`:'').join('')}
<p><a class="sv-more-link" href="/region/${esc(p.region)}">${esc(p.region_name)} 정비소·검사소 모두 보기 →</a></p>
<section><h2>정보</h2><dl class="sv-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${connectHtml(p)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: ${p.kind==='repair'?'전국자동차정비업체표준데이터':p.kind==='inspect'?'전국자동차검사소표준데이터':p.kind==='wash'?'지방행정 인허가데이터(세차장정보)':'지방행정 인허가데이터(배출가스전문정비사업자·확인검사대행자)'}(${esc(p.org??'지자체')}). 정보가 다르면 관할 시·군·구청에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}`;
}

async function detail(p:Center,url:URL,env:Env,ctx:ExecutionContext){
  const key=new Request(`${url.origin}/center/${p.id}?b=${Math.floor(Date.now()/600e3)}&v=${encodeURIComponent(data().status.updated_at)}&t=2`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const at=(k:Kind,r:number,lim:number)=>p.lat!=null?near(p.lat,p.lon!,r,lim,[k],p.id).items:[];
  const groups:[string,(Center&{km:number})[]][]=p.kind==='inspect'?[['근처 다른 검사소',at('inspect',20,4)],['근처 정비소',at('repair',2,6)]]
    :p.kind==='wash'?[['근처 다른 세차장',at('wash',3,6)],['근처 정비소',at('repair',2,4)]]
    :[[p.kind==='repair'?'근처 다른 정비소':'근처 정비소',at('repair',2,6)],['가까운 자동차 검사소',at('inspect',20,3)],['근처 세차장',at('wash',3,3)]];
  const K=KINDS[p.kind];
  const title=`${p.name} ${p.kind==='repair'?'정비소':K.label} 위치·전화·영업 시간 | 내근처 서비스센터`;
  const I=insight(p);
  const desc=`${p.region_name} ${p.name}(${[K.title,p.sub].filter(Boolean).join(' · ')})${I.desc.length?` · ${I.desc.join(' · ')}`:''}: ${p.addr??p.jibun??''} ${p.tel??''}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+centerPath(p.id);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png?v=2"/><meta property="og:site_name" content="내근처 서비스센터"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="center-detail">CENTER_DETAIL<\/div>/,detailHtml(p,groups,I))
    .replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
function sitemap(path:string){
  const items=data().items.filter(p=>(p.stage??1)<=SITEMAP_STAGE),pages=Math.ceil(items.length/PER_SITEMAP);
  if(path==='/sitemap.xml')return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap>${Array.from({length:pages},(_,i)=>`<sitemap><loc>${SITE}/sitemap-centers-${i+1}.xml</loc></sitemap>`).join('')}</sitemapindex>`);
  const m=path.match(/^\/sitemap-centers-(\d+)\.xml$/);const i=m?+m[1]-1:-1;
  if(i<0||i>=pages)return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.slice(i*PER_SITEMAP,(i+1)*PER_SITEMAP).map(p=>`<url><loc>${SITE}${centerPath(p.id)}</loc></url>`).join('')}</urlset>`);
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const kinds=(p.get('kind')??'').split(',').filter(k=>k in KINDS) as Kind[];
        const r=near(lat,lon,Math.max(.2,Math.min(30,num(p.get('km'))??2)),Math.max(1,Math.min(300,num(p.get('limit'))??40)),kinds.length?kinds:null);
        return json({total:r.total,items:r.items.map(x=>({...slim(x),km:x.km}))},200,300);}
      if(url.pathname==='/api/brand-near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const r=await brandNear(env,p.get('brand')??'',lat,lon);if(!r)return json({error:'unavailable'},404,0);
        return new Response(JSON.stringify(r),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});}
      if(url.pathname==='/api/search'){const q=flat(p.get('q')??'').slice(0,30);if(!q)return json({total:0,items:[]});
        const words=(p.get('q')??'').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4).map(flat);
        const hit=data().items.filter(x=>{const name=flat(x.name),where=flat(x.region_name+(x.addr??'')+(x.jibun??''));return words.every(w=>name.includes(w)||where.includes(w));});
        const score=(x:Center)=>{const name=flat(x.name);return name.startsWith(q)?0:name.includes(q)?1:2+words.filter(w=>!name.includes(w)).length;};
        hit.sort((a,b)=>score(a)-score(b)||a.name.localeCompare(b.name));
        return json({total:hit.length,items:hit.slice(0,40).map(slim)},200,600);}
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:data().status,now:kstNow()},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      if(url.pathname==='/sitemap.xml'||url.pathname.startsWith('/sitemap-centers-')){const s=sitemap(url.pathname);if(s)return s;}
      const m=url.pathname.match(/^\/center\/([a-z]-[0-9A-Za-z]{3,30})\/?$/);
      if(m){const x=get(m[1]);if(x)return await detail(x,url,env,ctx);}
      if(m||url.pathname==='/center/shell'||url.pathname==='/center/shell.html'||url.pathname.startsWith('/sitemap-centers-')){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
