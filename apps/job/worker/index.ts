// Cloudflare Worker for job.guidejung.com (내근처 일자리 — 채용 공고 없이 '일자리 찾을 때 가는 곳'). Static pages: ./out (Next.js export).
// The list ships with the Worker (data/places.json, scripts/collect-job.py — 고용센터·직업소개소·새일센터·노인일자리·대학일자리센터; no
// database), imported as text (wrangler.jsonc rules) and parsed on first use.
// Routes: /api/near(+ 관할 고용센터), /api/search, /api/fav, /api/where, /api/status,
// 상세 /place/{id} (server-rendered into /place/shell), /sitemap.xml (index) → /sitemap-pages.xml (Next) + /sitemap-places-1.xml.
// 위치: 브라우저는 약 2km 칸 중심만 보낸다(packages/ui/src/geo.tsx) — 여기 오는 lat/lon은 칸 중심.
import raw from '../data/places.json';
import weatherRegions from '../../weather/data/regions.json';
import {ADS,distKm,esc,eun,homeLinks,KIND_ORDER,KINDS,km,LINKS,mapUrl,naverUrl,placePath,SITE,slim,SUBS,tagsOf,telHref,type Kind,type Place} from '../lib/fmt';
import {actionsHtml} from '../../../packages/ui/src/actions';
import {aroundHtml} from '../../../packages/ui/src/live';

interface Env{ASSETS:Fetcher}
type Data={status:{updated_at:string;count:number};items:Place[]};
let parsed:Data|null=null,byId:Map<string,Place>|null=null,names:Map<string,string>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const get=(id:string)=>(byId??=new Map(data().items.map(p=>[p.id,p]))).get(id);
/** 지역 코드 → 이름(우리 목록에 있는 지역만) */
const regionName=(code:string)=>(names??=new Map(data().items.map(p=>[p.region,p.region_name]))).get(code)??null;
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':maxAge?`public, max-age=${maxAge}`:'no-store','access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();
type Near=Place&{km:number};

function near(lat:number,lon:number,radius:number,opt:{limit?:number;per?:number;kinds?:Kind[]|null;skip?:string}){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180));
  const out:Near[]=[];const counts=Object.fromEntries(KIND_ORDER.map(k=>[k,0])) as Record<Kind,number>;
  for(const p of data().items){
    if(p.lat==null||p.id===opt.skip||Math.abs(p.lat-lat)>dLat||Math.abs(p.lon!-lon)>dLon)continue;
    if(opt.kinds&&!opt.kinds.includes(p.kind))continue;
    const d=distKm(lat,lon,p.lat,p.lon!);if(d>radius)continue;
    counts[p.kind]++;out.push({...p,km:Math.round(d*100)/100});
  }
  out.sort((a,b)=>a.km-b.km);
  let items=out;
  if(opt.per){const seen:Record<string,number>={};items=out.filter(p=>(seen[p.kind]=(seen[p.kind]??0)+1)<=opt.per!);}
  return {total:out.length,counts,items:items.slice(0,opt.limit??200)};
}

type WR={code:string;name:string;sidoShort:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
/** 가장 가까운 시군구(우리 지역 코드: 일반구는 시 코드)와 그 관할 고용센터. 못 맞춘 곳은 가장 가까운 센터. */
// '동네 직접 고르기'로 고른 곳의 시·군·구 이름(sgg, packages/ui geo.tsx pickArea)이 오면 그 이름의 시군구 중 가까운 곳(11/8: 고촌읍이 강서구로 잡혀 강서센터가 나왔음).
const sggWords=(s:string)=>s.split(/\s+/).filter(x=>/[시군구]$/.test(x)&&!/(특별|광역|자치)시$/.test(x));
function areaOf(lat:number,lon:number,sgg?:string|null){
  // 시군구 중심점이 가장 가까운 곳은 경계에서 자주 틀림(강남역 → 서초구) → 1.5km 안 가까운 기관 9곳의 주소 시군구 다수결, 없으면 중심점.
  const close=near(lat,lon,1.5,{limit:9}).items;
  const vote=new Map<string,number>();for(const x of close)vote.set(x.region,(vote.get(x.region)??0)+1);
  const top=[...vote].sort((a,b)=>b[1]-a[1])[0];
  const want=new Set(sggWords(sgg??'')),hint=want.size?WREG.filter(y=>{const p=sggWords(y.name);return p.length>0&&p.every(x=>want.has(x));}):[];
  const r=(hint.length?hint:WREG).reduce((x,y)=>distKm(lat,lon,y.lat,y.lon)<distKm(lat,lon,x.lat,x.lon)?y:x);
  const code=!hint.length&&top&&top[1]>=3?top[0]:r.name.includes(' ')?r.code.slice(0,4)+'0':r.code;
  const cs=data().items.filter(p=>p.kind==='center');
  const own=cs.filter(c=>c.juris?.includes(code)||c.juris?.includes(r.code));
  const list=(own.length?own:cs.filter(c=>c.lat!=null).sort((a,b)=>distKm(lat,lon,a.lat!,a.lon!)-distKm(lat,lon,b.lat!,b.lon!)).slice(0,1))
    .map(c=>({...c,km:c.lat!=null?Math.round(distKm(lat,lon,c.lat,c.lon!)*100)/100:0})).sort((a,b)=>a.km-b.km);
  return {area:{code,name:regionName(code)??(r.name.startsWith(r.sidoShort)?r.name:`${r.sidoShort} ${r.name}`)},juris:list,exact:own.length>0};
}

// ---- detail page ----------------------------------------------------------------------------------------------------
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/place/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});
function connectHtml(p:Place){
  const c=p.region;
  const items:[string,string,string,string][]=[
    ['🎁','우리 동네 구직·청년 지원','지자체 지원금과 마감 임박 혜택',`https://benefit.guidejung.com/region/${c}`],
    ['🖨️','이력서용 서류 떼는 곳','등본·졸업증명서·고용보험 이력 — 무인민원발급기',`https://minwon.guidejung.com/region/${c}`],
    ['🏥','보건증(건강진단) 받는 곳','음식점 일 전에 — 근처 병원',`https://hospital.guidejung.com/region/${c}`],
    ['🅿️','근처 공영·무료 주차장','방문할 때 세울 곳',`https://parking.guidejung.com/region/${c}`],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,h])=>`<a href="${esc(h)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const cardHtml=(c:Near)=>`<div class="jb-card"><a class="jb-card-main"${c.lat!=null&&c.lon!=null?` data-gj-pt="${c.lat},${c.lon}" data-gj-name="${esc(c.name)}"`:''} href="${placePath(c.id)}"><span class="jb-kind" aria-hidden="true">${KINDS[c.kind].icon}</span><span class="jb-card-body"><b>${esc(c.name)}</b><small><span class="jb-km">${esc(km(c.km))}</span><span class="jb-tag">${esc(KINDS[c.kind].label)}</span>${tagsOf(c).map(t=>`<span class="jb-tag">${esc(t)}</span>`).join('')}</small><small class="muted">${esc(c.addr??c.jibun??'')}</small></span></a>${c.tel?`<span class="jb-acts"><a href="${esc(telHref(c.tel))}" aria-label="전화">📞</a></span>`:''}</div>`;
const n2=(v:number)=>v.toLocaleString('ko-KR');
// 11/14 '이어서 보기'(병원·시장 11/12와 같은 방식): 상세 첫 화면에서 근처 같은 종류로 — 아래 '근처 다른 ○○' 칸은 스크롤이 거기까지 잘 안 감.
function nextHtml(p:Place,groups:[string,Near[]][]){
  const pick=(groups[0]?.[1]??[]).slice(0,3);
  if(!pick.length)return '';
  const K=KINDS[p.kind],exam=p.kind==='exam';
  return `<nav class="gj-next" aria-label="이어서 보기"><span>근처 ${esc(exam?'시험장':K.label)}</span>${pick.map(c=>`<a href="${placePath(c.id)}">${esc(c.name)}<small>${esc(km(c.km))}${tagsOf(c)[0]?` · ${esc(tagsOf(c)[0])}`:''}</small></a>`).join('')}<a class="all" href="/region/${esc(p.region)}${exam?'/exam':''}">${esc(p.region_name)} ${exam?'시험장':'일자리 기관'} 전체 →</a></nav>`;
}

/** 종류마다 상세 위쪽 안내(사실만, 공식 링크) */
function kindNote(p:Place){
  if(p.kind==='center')return `<section><h2>🏛️ 이 센터에서 하는 일</h2><p>실업급여(구직급여)·국민취업지원제도 신청과 구직 상담을 하는 고용노동부 센터예요. 실업급여는 <b>주민등록 주소지를 관할하는 센터</b>에서 신청해요. 자격·금액·순서는 <a href="${LINKS.work24}" rel="noopener" target="_blank">고용24</a> 공식 안내를 확인하세요.</p>
${p.juris?.length?`<h3>관할 지역 ${p.juris.length}곳</h3><div class="jb-jump">${p.juris.map(c=>{const nm=regionName(c);return nm?`<a href="/region/${esc(c)}">${esc(nm)}</a>`:'';}).join('')}</div>`:''}${p.juris_text?`<p class="muted small">고용노동부 자료의 관할구역: ${esc(p.juris_text)}</p>`:''}</section>`;
  if(p.kind==='agency')return `<section class="jb-guide"><h2>🔨 직업소개소 이용 전에</h2><ul><li>지자체에 등록된 유료직업소개소예요(행정안전부 인허가 정보, 영업 중).${p.since?` 등록 ${esc(p.since)}년.`:''}</li><li>유료직업소개소는 구직자에게 <b>선급금을 받을 수 없어요</b>(직업안정법 제21조의2). 소개 요금은 고용노동부가 고시한 기준을 따라야 해요.</li><li>일을 시작하기 전에 근로계약서를 받으세요. 건설 현장은 건설업 기초안전보건교육 이수증이 필요해요.</li></ul><p><a class="jb-more-link" href="/guide#today">오늘 일당 일자리 — 이용 순서 보기 →</a></p></section>`;
  if(p.kind==='free')return `<section><h2>🤝 무료직업소개소</h2><p>지자체·공공기관·단체가 수수료 없이 운영하는 직업소개소예요(지자체 신고 정보, 영업 중). 운영 시간과 소개 분야는 전화로 확인하세요.</p></section>`;
  if(p.kind==='women')return `<section><h2>👩 새일센터에서 하는 일</h2><p>경력이 끊긴 여성의 구직 상담·직업교육·인턴을 안내해요. 교육 과정과 일정은 <a href="${LINKS.saeil}" rel="noopener" target="_blank">e새일</a>에서 확인하세요.</p></section>`;
  if(p.kind==='senior')return `<section><h2>👴 노인일자리 수행기관</h2><p>노인일자리 사업을 하는 기관이에요. 참여자 모집 공고는 <a href="${LINKS.senior}" rel="noopener" target="_blank">노인일자리 여기</a>에서 찾고, 기관에 직접 문의하세요. 원본 자료에서 전화번호가 가려져 있어 싣지 않았어요.</p></section>`;
  if(p.kind==='exam')return `<section class="jb-guide"><h2>📝 이 시험장에 가기 전에</h2><ul><li>국가기술자격 시험장은 원서를 접수할 때 고르고, 시험 날에는 수험표에 적힌 시험장으로 가요. 종목·회차마다 쓰는 시험장이 달라요. 내 시험장·시험실·입실 시간은 <a href="${LINKS.qnet}" rel="noopener" target="_blank">큐넷</a> 수험표에서 확인하세요.</li><li>주차가 되는지는 시험장마다 달라요. 수험표 안내를 먼저 보고, 어려우면 아래 근처 공영주차장을 찾아 두세요.</li></ul>${p.rooms?.length?`<h3>이 주소의 시험실 ${p.rooms.length}곳</h3><ul class="jb-plain">${p.rooms.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>`:''}${p.guide?`<p class="muted small">공단 자료의 위치 안내: ${esc(p.guide)} <span>(예전 안내일 수 있어요 — 수험표 안내가 우선)</span></p>`:''}<p><a class="jb-more-link" href="/schedule">📅 자격증 시험 일정 — 지금 접수 중인 회차 →</a> · <a class="jb-more-link" href="${LINKS.qnet}" rel="noopener" target="_blank">큐넷 원서 접수 ↗</a></p></section>`;
  return `<section><h2>🎓 대학일자리플러스센터</h2><p>대학 안에서 진로·취업 상담을 하는 고용노동부 지원 센터예요. 이용 대상은 센터마다 달라 미리 확인하세요.</p></section>`;
}

const homeLinksHtml=(center:{name:string;hp?:string|null}|null|undefined,region:string|null|undefined)=>`<div class="jb-hp">${homeLinks(center,region).map(([t,u])=>`<a href="${esc(u)}" rel="noopener" target="_blank">🏠 ${esc(t)} ↗</a>`).join('')}<a class="sub" href="${LINKS.w24find}" rel="noopener" target="_blank">🔎 고용24 기관찾기 ↗</a></div>`;
function detailHtml(p:Place,groups:[string,Near[]][],juris:ReturnType<typeof areaOf>|null){
  const addr=p.addr??p.jibun,K=KINDS[p.kind];
  const tags=tagsOf(p);
  const jur=p.kind!=='center'&&p.kind!=='exam'&&juris?.juris[0]?juris.juris[0]:null;
  const faq:[string,string][]=([
    [`${eun(p.name)} 어디에 있나요?`,addr?`${addr}에 있습니다${p.tel?`(전화 ${p.tel})`:''}.`:''],
    ...(p.kind==='center'?[[`${p.name} 관할 지역은?`,p.juris?.length?`${p.juris.map(c=>regionName(c)).filter(Boolean).join(', ')}입니다. 실업급여는 주민등록 주소지 관할 센터에서 신청합니다.`:''] as [string,string]]:[]),
    ...(p.kind==='agency'?[[`${eun(p.name)} 등록된 직업소개소인가요?`,`네. 지자체에 등록된 유료직업소개소(영업 중)입니다${p.since?` — ${p.since}년 등록`:''}. 유료직업소개소는 구직자에게 선급금을 받을 수 없습니다(직업안정법 제21조의2).`] as [string,string]]:[]),
    ...(p.kind==='exam'?[[`${p.name}에서 어떤 시험을 보나요?`,`한국산업인력공단이 등록한 국가자격 시험장입니다${p.gb?`(${p.gb})`:''}. 국가기술자격 시험장은 원서를 접수할 때 고르고, 시험 날에는 수험표에 적힌 시험장으로 가요. 종목·회차마다 쓰는 시험장이 달라요. 큐넷 수험표에서 확인하세요.`] as [string,string]]:[]),
    ...(jur?[[`${p.region_name} 실업급여는 어디서 신청하나요?`,`${juris!.exact?'관할':'가까운'} 고용센터는 ${jur.name}입니다.`] as [string,string]]:[]),
  ] as [string,string][]).filter(([,x])=>x);
  const [sido,...rest]=p.region_name.split(' ');
  const ld={'@context':'https://schema.org','@type':K.ld,name:p.name,url:SITE+placePath(p.id),image:SITE+'/og.png?v=2',
    ...(addr?{address:{'@type':'PostalAddress',streetAddress:addr,addressLocality:rest.join(' ')||sido,addressRegion:sido,addressCountry:'KR'}}:{}),
    ...(p.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:p.lat,longitude:p.lon}}:{}),...(p.tel?{telephone:p.tel}:{}),...(p.hp?{sameAs:p.hp}:{}),
    ...(p.kind==='center'&&p.juris?.length?{areaServed:p.juris.map(c=>regionName(c)).filter(Boolean).map(name=>({'@type':'AdministrativeArea',name}))}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 일자리',SITE+'/'],['지역별',SITE+'/region'],[p.region_name,`${SITE}/region/${p.region}`],[p.name,SITE+placePath(p.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const facts:[string,string|null|undefined][]=[['구분',K.title],['도로명 주소',p.addr],['지번 주소',p.addr?null:p.jibun],['전화',p.tel],['종류',p.kind==='agency'&&p.sub?SUBS[p.sub]:null],
    ['운영 형태',p.corp],['등록 연도',p.since],['소속',p.kind==='center'||p.kind==='campus'||p.kind==='exam'?p.org:null],['시험장 구분',p.kind==='exam'?p.gb:null],['지역',p.region_name]];
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별</a> › <a href="/region/${esc(p.region)}">${esc(p.region_name)}</a> › ${esc(p.name)}</nav>
<div class="jb-head"><h1>${K.icon} ${esc(p.name)}</h1><p>${esc([p.region_name,K.title,...tags].join(' · '))}</p></div>${actionsHtml({id:p.id,name:p.name,sub:[K.label,p.region_name].join(' · '),url:placePath(p.id)})}
<p class="jb-answer"><b>${esc(K.title)}</b>${addr?` · ${esc(addr)}`:''}${p.tel?` · ${esc(p.tel)}`:''}</p>
<div class="jb-actions">${p.tel?`<a href="${esc(telHref(p.tel))}">📞 전화하기</a>`:''}<a class="${p.tel?'sub':''}" href="${esc(mapUrl(p))}" rel="noopener" target="_blank">🧭 길찾기</a>${p.kind==='center'&&p.hp?`<a class="sub" href="${esc(p.hp)}" rel="noopener" target="_blank">🏠 센터 홈페이지 ↗</a>`:''}<a class="naver" href="${esc(naverUrl(p))}" rel="noopener" target="_blank">🟢 네이버 지도에서 보기</a></div>
${nextHtml(p,groups)}
${p.kind==='exam'?'':jur?`<a class="jb-juris" href="${placePath(jur.id)}"><span aria-hidden="true">🏛️</span><span><small>${esc(p.region_name)} ${juris!.exact?'관할 고용센터':'에서 가까운 고용센터'}</small><b>${esc(jur.name)}</b><small>${esc(jur.addr??'')}</small></span><em>실업급여·구직 신청 →</em></a>${homeLinksHtml(jur,p.region)}`:homeLinksHtml(null,p.region)}
${kindNote(p)}
${groups.map(([title,list])=>list.length?`<section><h2>${esc(title)}</h2><div class="jb-cards">${list.map(cardHtml).join('')}</div></section>`:'').join('')}
<p><a class="jb-more-link" href="/region/${esc(p.region)}${p.kind==='exam'?'/exam':''}">${esc(p.region_name)} ${p.kind==='exam'?'자격증 시험장':'일자리 기관'} 모두 보기 →</a></p>
${p.lat!=null&&p.lon!=null?aroundHtml(p.lat,p.lon,p.kind==='exam'?'☕ 시험 전후 걸어서 갈 곳':'☕ 방문 김에 걸어서 갈 곳',p.kind==='exam'?'CS2,CE7,FD6':'CE7,CS2,BK9,FD6'):''}
<section><h2>정보</h2><dl class="jb-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
<p class="jb-note">채용 공고는 이 사이트에 없어요. 공고는 <a href="${LINKS.work24}" rel="noopener" target="_blank">고용24</a>·<a href="${LINKS.senior}" rel="noopener" target="_blank">노인일자리 여기</a>·<a href="${LINKS.saeil}" rel="noopener" target="_blank">e새일</a>에서 찾으세요.</p>
${connectHtml(p)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: ${esc(K.src)}. 정보가 다르면 관할 기관에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}`;
}

async function detail(p:Place,url:URL,env:Env,ctx:ExecutionContext){
  const key=new Request(`${url.origin}/place/${p.id}?v=${encodeURIComponent(data().status.updated_at)}&a=${ADS?1:0}`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const at=(k:Kind,r:number,lim:number)=>p.lat!=null?near(p.lat,p.lon!,r,{limit:lim,kinds:[k],skip:p.id}).items:[];
  const K=KINDS[p.kind];
  const wide=p.kind==='center'||p.kind==='women'||p.kind==='campus';
  const groups:[string,Near[]][]=p.kind==='exam'?[['근처 다른 자격증 시험장',at('exam',15,6)]]:[[`근처 다른 ${K.label}`,at(p.kind,wide?30:3,6)],
    ...(['agency','free','women','senior'] as Kind[]).filter(k=>k!==p.kind).map(k=>[`근처 ${KINDS[k].label}`,at(k,k==='women'?20:5,3)] as [string,Near[]])];
  const juris=p.lat!=null?areaOf(p.lat,p.lon!):null;
  const title=`${p.name} ${p.kind==='center'?'관할 지역·위치·전화':p.kind==='exam'?'자격증 시험장 위치·가는 길':`${K.label} 위치·전화`} | 내근처 일자리`;
  const desc=`${p.region_name} ${p.name}(${K.title}): ${p.addr??p.jibun??''}${p.tel?` · ${p.tel}`:''}${p.kind==='center'&&p.juris?.length?` · 관할 ${p.juris.map(c=>regionName(c)).filter(Boolean).slice(0,6).join(', ')}`:''}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+placePath(p.id);
  let html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png?v=2"/><meta property="og:site_name" content="내근처 일자리"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="place-detail">PLACE_DETAIL<\/div>/,detailHtml(p,groups,juris));
  if(ADS)html=html.replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=3600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
function sitemap(path:string){
  if(path==='/sitemap.xml')return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap><sitemap><loc>${SITE}/sitemap-places-1.xml</loc></sitemap></sitemapindex>`);
  if(path!=='/sitemap-places-1.xml')return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${data().items.map(p=>`<url><loc>${SITE}${placePath(p.id)}</loc></url>`).join('')}</urlset>`);
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/fav'){const ids=[...new Set((p.get('ids')??'').split(','))].filter(x=>/^[0-9A-Za-z-]{2,40}$/.test(x)).slice(0,20);
        return json({items:ids.map(get).filter((x):x is Place=>!!x).map(x=>({id:x.id,state:null,label:'',line:[KINDS[x.kind].label,x.region_name].join(' · ')}))},200,600);}
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null||lat<33||lat>39)return json({error:'lat/lon'},400,0);
        const kinds=(p.get('kind')??'').split(',').filter(k=>k in KINDS) as Kind[];
        const per=num(p.get('per'));
        const r=near(lat,lon,Math.max(.2,Math.min(50,num(p.get('km'))??2)),{limit:Math.max(1,Math.min(600,num(p.get('limit'))??100)),per:per?Math.max(1,Math.min(200,per)):undefined,kinds:kinds.length?kinds:null});
        const a=areaOf(lat,lon,(p.get('sgg')??'').slice(0,30));
        return json({total:r.total,counts:r.counts,items:r.items.map(x=>({...slim(x),km:x.km})),area:a.area,exact:a.exact,juris:a.juris.map(x=>({...slim(x),km:x.km}))},200,300);}
      if(url.pathname==='/api/search'){const q=flat(p.get('q')??'').slice(0,30);if(!q)return json({total:0,items:[]});
        const words=(p.get('q')??'').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4).map(flat);
        const hit=data().items.filter(x=>{const name=flat(x.name),where=flat(x.region_name+(x.addr??x.jibun??'')+KINDS[x.kind].title+(x.sub?SUBS[x.sub]:''));return words.every(w=>name.includes(w)||where.includes(w));});
        const score=(x:Place)=>{const name=flat(x.name);return name.startsWith(q)?0:name.includes(q)?1:2+words.filter(w=>!name.includes(w)).length;};
        hit.sort((a,b)=>score(a)-score(b)||KIND_ORDER.indexOf(a.kind)-KIND_ORDER.indexOf(b.kind)||a.name.localeCompare(b.name));
        return json({total:hit.length,items:hit.slice(0,40).map(slim)},200,600);}
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:data().status,ads:ADS},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      if(url.pathname==='/sitemap.xml'||url.pathname.startsWith('/sitemap-places-')){const s=sitemap(url.pathname);if(s)return s;}
      const m=url.pathname.match(/^\/place\/([a-z][0-9A-Za-z-]{2,40})\/?$/);
      if(m&&m[1]!=='shell'){const x=get(m[1]);if(x)return await detail(x,url,env,ctx);}
      if(m||url.pathname==='/place/shell.html'||url.pathname.startsWith('/sitemap-places-')){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
