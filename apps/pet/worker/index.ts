// Cloudflare Worker for pet.guidejung.com (내근처 동물병원). Static pages: ./out (Next.js export).
// The list ships with the Worker (data/places.json, scripts/collect-pet.py — 동물병원·동물약국·위탁관리·전시·운송업;
// no database), imported as text (wrangler.jsonc rules) and parsed on first use.
// Routes: /api/near, /api/search, /api/fav, /api/where, /api/status, /api/animals, 상세 /place/{id} (server-rendered into /place/shell),
// 보호 중인 동물 /animal/{id} (noindex — 공고가 끝나면 사라짐), 사진 /photo/{id} (원본 http 주소를 받아 https로, 하루 캐시),
// /sitemap.xml (index) → /sitemap-pages.xml (Next) + /sitemap-places-{n}.xml (here, 40,000 each).
import raw from '../data/places.json';
import animalsRaw from '../data/animals.json';
import weatherRegions from '../../weather/data/regions.json';
import {animalPath,animalTitle,ANIMAL_SITE,daysLeft,ddayLabel,photoPath,type Animal,distKm,esc,eun,ro,is24,KIND_ORDER,KINDS,km,mapUrl,naverUrl,PHARMACY_SITE,placePath,sinceLine,SITE,slim,stateOf,telHref,weekLine,years,type Kind,type Place} from '../lib/fmt';
import {actionsHtml} from '../../../packages/ui/src/actions';

interface Env{ASSETS:Fetcher}
type Data={status:{updated_at:string;count:number};items:Place[]};
let parsed:Data|null=null,byId:Map<string,Place>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const get=(id:string)=>(byId??=new Map(data().items.map(p=>[p.id,p]))).get(id);
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();
const PER_SITEMAP=40000;
type AData={status:{updated_at:string};animals:Animal[];lost:Animal[]};
let aParsed:AData|null=null,aById:Map<string,Animal>|null=null,byShelter:Map<string,Animal[]>|null=null;
const adata=()=>aParsed??=(typeof animalsRaw==='string'?JSON.parse(animalsRaw):animalsRaw) as AData;
const animal=(id:string)=>(aById??=new Map([...adata().animals,...adata().lost].map(a=>[a.id,a]))).get(id);
const shelterAnimals=(sid:string)=>(byShelter??=(()=>{const m=new Map<string,Animal[]>();for(const a of adata().animals)if(a.shelter)(m.get(a.shelter)??m.set(a.shelter,[]).get(a.shelter)!).push(a);return m;})()).get(sid)??[];
type Near=Place&{km:number};
const isOpen=(p:Place)=>{const s=stateOf(p);return !!s&&s.state!=='closed';};

/** 반경 안 곳을 가까운 순으로. per를 주면 종류마다 per곳씩(동물약국이 많아 다른 종류가 묻히지 않게), counts는 종류별 전체 수,
 * open은 지금 문 연 동물약국 수. sub로 세부('24시')만 고를 수 있음. */
function near(lat:number,lon:number,radius:number,opt:{limit?:number;per?:number;kinds?:Kind[]|null;sub?:string|null;skip?:string;open?:boolean}){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180));
  const out:Near[]=[];const counts=Object.fromEntries(KIND_ORDER.map(k=>[k,0])) as Record<Kind,number>;let open=0;
  for(const p of data().items){
    if(p.lat==null||p.id===opt.skip||Math.abs(p.lat-lat)>dLat||Math.abs(p.lon!-lon)>dLon)continue;
    if(opt.kinds&&!opt.kinds.includes(p.kind))continue;
    if(opt.sub&&p.sub!==opt.sub)continue;
    const d=distKm(lat,lon,p.lat,p.lon!);if(d>radius)continue;
    const o=p.kind==='pharmacy'&&isOpen(p);
    if(opt.open&&!o)continue;
    counts[p.kind]++;if(o)open++;out.push({...p,km:Math.round(d*100)/100});
  }
  out.sort((a,b)=>a.km-b.km);
  let items=out;
  if(opt.per){const seen:Record<string,number>={};items=out.filter(p=>(seen[p.kind]=(seen[p.kind]??0)+1)<=opt.per!);}
  return {total:out.length,counts,open,items:items.slice(0,opt.limit??200)};
}

// ---- detail page ----------------------------------------------------------------------------------------------------
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/place/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});
type WR={code:string;name:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
function connectHtml(p:Place){
  if(p.lat==null||p.lon==null)return '';
  const r=WREG.reduce((x,y)=>distKm(p.lat!,p.lon!,y.lat,y.lon)<distKm(p.lat!,p.lon!,x.lat,x.lon)?y:x);
  const code=r.name.includes(' ')?r.code.slice(0,4)+'0':r.code;  // 일반구가 있는 시는 시 코드(약국·주차장 사이트와 같음)
  const ll=`lat=${p.lat.toFixed(4)}&lon=${p.lon.toFixed(4)}`;
  const items:[string,string,string,string][]=[
    ['🅿️','근처 공영·무료 주차장','병원 갈 때 세울 곳',`https://parking.guidejung.com/region/${code}`],
    ['💊','근처 지금 문 연 약국','사람 약국 영업 시간',`${PHARMACY_SITE}/region/${code}`],
    ['🌤️',`${r.name} 산책 날씨`,'오늘 날씨와 미세먼지',`https://weather.guidejung.com/region/${r.code}`],
    ['🐕','반려동물과 갈 만한 곳','20km 안 반려동물 동반 여행지',`https://trip.guidejung.com/search?${ll}&radius_km=20&condition=pet`],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,h])=>`<a href="${esc(h)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const cardHtml=(c:Near)=>{const st=stateOf(c);return `<div class="pt-card${st?' '+st.state:''}"><a class="pt-card-main" href="${placePath(c.id)}"><span class="pt-kind" aria-hidden="true">${KINDS[c.kind].icon}</span><span class="pt-card-body"><b>${esc(c.name)}</b><small><span class="pt-km">${esc(km(c.km))}</span>${c.sub?`<span class="pt-tag${is24(c)?' h24':''}">${esc(c.sub)}</span>`:''}${st?`<span class="pt-state"><i class="pt-dot"></i>${esc(st.label)}</span>`:esc(sinceLine(c.since)??'')}</small><small class="muted">${esc(c.addr??c.jibun??'')}</small></span></a><span class="pt-acts">${c.tel?`<a href="${esc(telHref(c.tel))}" aria-label="전화">📞</a>`:''}<a href="${esc(mapUrl(c))}" target="_blank" rel="noopener" aria-label="길찾기">🧭</a></span></div>`;};
const animalCard=(a:Animal&{km?:number},lost=false)=>{const d=lost?null:daysLeft(a.until),label=lost?(a.lost?`${a.lost.slice(5).replace('-','/')} 실종`:''):ddayLabel(a.until)??'';
  const inner=`<span class="pt-photo">${a.photo?`<img src="${photoPath(a.id)}" alt="${esc(`${lost?'실종':'보호 중인'} ${a.kind??a.up??'동물'}`)}" loading="lazy" decoding="async" onerror="this.remove()">`:'<span aria-hidden="true">🐾</span>'}${label?`<em class="${d!=null&&d>=0&&d<=3?'soon':lost?'lost':''}">${esc(label)}</em>`:''}</span><span class="pt-animal-body"><b>${esc(animalTitle(a)||'정보 확인 중')}</b><small>${a.km!=null?`<span class="pt-km">${esc(km(a.km))}</span>`:''}${esc(lost?a.where??'':a.region_name+(a.color?` · ${a.color}`:''))}</small>${a.mark?`<small class="muted">${esc(a.mark)}</small>`:''}</span>`;
  return lost?`<div class="pt-animal lost">${inner}</div>`:`<a class="pt-animal" href="${animalPath(a.id)}">${inner}</a>`;};
const ABOUT:Record<Kind,string>={
  hospital:'수의사가 개설해 시·군·구에 신고한 동물병원이에요.',
  pharmacy:'동물용 의약품 판매를 신고한 약국이에요.',
  shelter:'동물보호법에 따라 지자체가 유실·유기동물을 구조·보호하도록 지정한 동물보호센터예요.',
  hotel:'동물보호법의 동물위탁관리업(펫호텔·유치원)으로 등록한 곳이에요.',
  cafe:'동물보호법의 동물전시업(애견·고양이 카페 등)으로 등록한 곳이에요.',
  taxi:'동물보호법의 동물운송업(펫택시)으로 등록한 업체예요.',
};

function shelterHtml(p:Place){
  const list=shelterAnimals(p.id);
  return `<section><h2>🐾 지금 보호 중인 아이들 <span class="muted">${list.length}마리</span></h2>${list.length?`<div class="pt-animals">${list.slice(0,24).map(a=>animalCard(a)).join('')}</div>${list.length>24?`<p class="muted small">그 밖에 ${list.length-24}마리 — 보호소에 문의하세요.</p>`:''}`:'<p class="muted">지금 공고 중인 아이가 없어요.</p>'}<p class="muted small">${esc(adata().status.updated_at.slice(0,10))} 기준 · 그사이 입양되거나 보호자를 찾았을 수 있어요.</p></section>`;
}
function detailHtml(p:Place,groups:[string,Near[]][]){
  const addr=p.addr??p.jibun,K=KINDS[p.kind],y=years(p.since),st=stateOf(p),h24=is24(p);
  const what=[K.title,p.sub&&p.sub!==K.title?p.sub:null].filter(Boolean).join(' · ');
  const hoursQ:[string,string]=p.kind==='pharmacy'
    ?[`${p.name} 영업 시간은?`,p.hours?`${weekLine({hours:p.hours})}입니다(국립중앙의료원 약국 정보). 지금은 ${st?.label??'확인 필요'}.`:`영업 시간 정보가 없습니다.${p.tel?` 전화(${p.tel})로`:''} 확인하세요.`]
    :p.kind==='shelter'?[`${p.name} 운영 시간은?`,`${p.open?`${p.open}입니다`:'운영 시간 정보가 없습니다'}${p.off?`(휴무 ${p.off})`:''}. 방문 전에${p.tel?` 전화(${p.tel})로`:''} 확인하세요.`]
    :p.kind==='hospital'?[`${p.name} 진료 시간은?`,`공공데이터에는 진료 시간이 없습니다.${h24?' 이름에 ‘24’가 들어간 병원이지만 야간 진료 여부는 꼭 확인하세요.':''} 네이버 지도에서 ‘${p.name}’을 검색하거나${p.tel?` 전화(${p.tel})로`:''} 확인하세요.`]
    :[`${p.name} 이용 시간과 가격은?`,`공공데이터에는 이용 시간·가격이 없습니다. 네이버 지도에서 ‘${p.name}’을 검색하거나${p.tel?` 전화(${p.tel})로`:''} 확인하세요.`];
  const faq:[string,string][]=([
    [`${eun(p.name)} 어디에 있나요?`,addr?`${addr}에 있습니다${p.tel?`(전화 ${p.tel})`:''}.`:''],
    [`${eun(p.name)} 신고된 곳인가요?`,`네. ${p.region_name}에 ${p.since?`${ro(p.sub&&(p.kind==='hotel'||p.kind==='cafe')?p.sub:K.title)}(신고일 ${p.since}${y?`, ${y}년째`:''})`:ro(K.title)} 영업 신고가 된 곳입니다(행정안전부 지방행정 인허가데이터).`],
    hoursQ,
  ] as [string,string][]).filter(([,x])=>x);
  const [sido,...rest]=p.region_name.split(' ');
  const DAYS:Record<string,string>={'1':'Monday','2':'Tuesday','3':'Wednesday','4':'Thursday','5':'Friday','6':'Saturday','7':'Sunday'};
  const hhmm=(s:string)=>{const v=+s%2400;return `${String(Math.floor(v/100)).padStart(2,'0')}:${String(v%100).padStart(2,'0')}`;};
  const ld={'@context':'https://schema.org','@type':K.ld,name:p.name,url:SITE+placePath(p.id),image:SITE+'/og.png',
    ...(addr?{address:{'@type':'PostalAddress',streetAddress:addr,addressLocality:rest.join(' ')||sido,addressRegion:sido,addressCountry:'KR'}}:{}),
    ...(p.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:p.lat,longitude:p.lon}}:{}),...(p.tel?{telephone:p.tel}:{}),
    ...(p.since&&/^\d{4}-\d{2}-\d{2}$/.test(p.since)?{foundingDate:p.since}:{}),
    ...(p.hours?{openingHoursSpecification:Object.entries(p.hours).filter(([d])=>DAYS[d]).map(([d,[o,c]])=>({'@type':'OpeningHoursSpecification',dayOfWeek:`https://schema.org/${DAYS[d]}`,opens:hhmm(o),closes:hhmm(c)}))}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 동물병원',SITE+'/'],['지역별',SITE+'/region'],[p.region_name,`${SITE}/region/${p.region}`],[p.name,SITE+placePath(p.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const facts:[string,string|null][]=[['구분',what],['도로명 주소',p.addr],['지번 주소',p.jibun],['전화',p.tel],['영업 시간',p.hours?weekLine({hours:p.hours}):null],['운영 시간',p.open??null],['휴무일',p.off??null],['관할',p.org??null],['보호 대상·구분',p.kind==='shelter'?p.tags.join(' · ')||null:null],
    [p.kind==='shelter'?'지정일':'신고일',p.since?`${p.since}${y?` (${y}년째)`:''}`:null],['함께 등록',p.tags.filter(t=>t==='호텔').length?'동물위탁관리업(호텔)':null],['기준',p.ref?`${p.ref} 갱신`:null],['지역',p.region_name]];
  const answer=st?`<p class="pt-answer ${st.state}"><i class="pt-dot"></i><b>${esc(st.label)}</b>${st.today?` <span class="muted">· 오늘 ${esc(st.today)}</span>`:''}${addr?` <span class="muted">· ${esc(addr)}</span>`:''}</p>`
    :`<p class="pt-answer"><b>${esc(ABOUT[p.kind])}</b>${addr?` <span class="muted">· ${esc(addr)}</span>`:''}${p.since?` <span class="muted">· ${esc(sinceLine(p.since)??'')}</span>`:''}</p>`;
  const naverLabel=p.kind==='shelter'?'🟢 네이버 지도에서 보기':p.kind==='hospital'?'🟢 네이버 지도에서 진료 시간 보기':p.kind==='pharmacy'?'🟢 네이버 지도에서 보기':'🟢 네이버 지도에서 가격·예약 보기';
  const note=p.kind==='hospital'?(h24?'이름에 ‘24’가 들어간 병원이에요. 공공데이터에 진료 시간이 없으니 가기 전에 꼭 전화로 진료 여부를 확인하세요.':'진료 시간은 공공데이터에 없어요. 네이버 지도나 전화로 확인하세요. 밤·주말이면 아래 24시 동물병원도 확인하세요.')
    :p.kind==='shelter'?'운영 시간은 농림축산검역본부 자료예요. 방문·입양 상담 전에 전화로 확인하세요.'
    :p.kind==='pharmacy'?(p.hours?'영업 시간은 국립중앙의료원 약국 정보예요. 동물약이 있는지는 전화로 확인하세요.':'이 약국은 영업 시간 정보가 없어요. 전화로 확인하세요.')
    :'이용 시간·가격은 공공데이터에 없어요. 네이버 지도나 전화로 확인하세요.';
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별</a> › <a href="/region/${esc(p.region)}">${esc(p.region_name)}</a> › ${esc(p.name)}</nav>
<div class="pt-head"><h1>${K.icon} ${esc(p.name)}</h1><p>${esc([p.region_name,what].filter(Boolean).join(' · '))}</p></div>${actionsHtml({id:p.id,name:p.name,sub:[p.sub??K.label,p.region_name].join(' · '),url:placePath(p.id)})}
${answer}
<div class="pt-actions">${p.tel?`<a href="${esc(telHref(p.tel))}">📞 전화하기</a>`:''}<a class="${p.tel?'sub':''}" href="${esc(mapUrl(p))}" rel="noopener" target="_blank">🧭 길찾기</a><a class="naver" href="${esc(naverUrl(p))}" rel="noopener" target="_blank">${naverLabel}</a>${p.ph?`<a class="sub" href="${PHARMACY_SITE}/pharmacy/${esc(p.ph)}">💊 약국 요일별 시간표</a>`:''}</div>
<p class="pt-note">${esc(note)}</p>
${p.kind==='shelter'?shelterHtml(p):''}
${groups.map(([title,list])=>list.length?`<section><h2>${esc(title)}</h2><div class="pt-cards">${list.map(cardHtml).join('')}</div></section>`:'').join('')}
<p><a class="pt-more-link" href="/region/${esc(p.region)}/${p.kind}">${esc(p.region_name)} ${esc(K.label)} 모두 보기 →</a></p>
<section><h2>정보</h2><dl class="pt-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${connectHtml(p)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: ${esc(K.src)}${p.hours?', 국립중앙의료원 약국 정보(영업 시간)':''}. 정보가 다르면 관할 시·군·구청에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}`;
}

async function detail(p:Place,url:URL,env:Env,ctx:ExecutionContext){
  // 동물약국은 지금 상태가 바뀌므로 5분 단위로 캐시 키를 바꿈(약국 사이트와 같음).
  const slot=p.kind==='pharmacy'||p.kind==='hospital'?Math.floor(Date.now()/300e3):0;
  const key=new Request(`${url.origin}/place/${p.id}?v=${encodeURIComponent(data().status.updated_at)}&s=${slot}&t=1`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const at=(k:Kind,r:number,lim:number,o:{sub?:string;open?:boolean}={})=>p.lat!=null?near(p.lat,p.lon!,r,{limit:lim,kinds:[k],skip:p.id,...o}).items:[];
  const K=KINDS[p.kind];
  const groups:[string,Near[]][]=p.kind==='hospital'?[['가까운 24시 동물병원',at('hospital',30,3,{sub:'24시'})],['근처 다른 동물병원',at('hospital',3,6)],['근처 지금 문 연 동물약국',at('pharmacy',3,4,{open:true})]]
    :p.kind==='shelter'?[['가까운 다른 동물보호센터',at('shelter',30,4)],['가까운 동물병원',at('hospital',3,4)]]
    :p.kind==='pharmacy'?[['근처 지금 문 연 동물약국',at('pharmacy',3,6,{open:true})],['가까운 동물병원',at('hospital',3,4)],['가까운 24시 동물병원',at('hospital',30,2,{sub:'24시'})]]
    :[[`근처 다른 ${K.label}`,at(p.kind,p.kind==='hotel'?5:20,6)],['가까운 동물병원',at('hospital',3,4)],['가까운 24시 동물병원',at('hospital',30,2,{sub:'24시'})]];
  const title=`${p.name} ${p.kind==='hospital'?(is24(p)?'24시 동물병원':'동물병원'):K.label} 위치·전화 | 내근처 동물병원`;
  const desc=`${p.region_name} ${p.name}(${[K.title,p.sub].filter(Boolean).join(' · ')}): ${p.addr??p.jibun??''} ${p.tel??''} · ${p.hours?weekLine({hours:p.hours}):p.kind==='shelter'?`${p.open??''} 보호 중 ${shelterAnimals(p.id).length}마리`:sinceLine(p.since)??''}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+placePath(p.id);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png"/><meta property="og:site_name" content="내근처 동물병원"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="place-detail">PLACE_DETAIL<\/div>/,detailHtml(p,groups))
    .replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':`public, max-age=${slot?300:3600}`}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

function animalHtml(a:Animal){
  const sh=a.shelter?get(a.shelter):undefined,d=daysLeft(a.until),label=ddayLabel(a.until);
  const title=animalTitle(a)||'보호 중인 동물';
  const facts:[string,string|undefined][]=[['품종',a.kind],['종류',a.up],['색',a.color],['나이',a.age?.replace('(년생)','년생')],['체중',a.weight],['성별',a.sex],['중성화',a.neuter],['특징',a.mark],
    ['발견 장소',a.place],['발견일',a.found],['공고 번호',a.notice],['공고 기간',a.from||a.until?`${a.from??''} ~ ${a.until??''}`:undefined],['관할',a.org]];
  const tel=sh?.tel??a.shelter_tel,sname=sh?.name??a.shelter_name;
  const others=(a.shelter?shelterAnimals(a.shelter):[]).filter(x=>x.id!==a.id).slice(0,8);
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 동물병원',SITE+'/'],['보호 중인 아이들',SITE+'/adopt'],[title,SITE+animalPath(a.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/adopt">보호 중인 아이들</a> › ${esc(a.region_name)}</nav>
<div class="pt-head"><h1>🐾 ${esc(title)}</h1><p>${esc([a.region_name,sname].filter(Boolean).join(' · '))}</p></div>
<div class="pt-animal-hero">${a.photo?`<img src="${photoPath(a.id)}" alt="${esc(`보호 중인 ${a.kind??a.up??'동물'}`)}" onerror="this.remove()">`:'<span class="pt-photo">🐾</span>'}<div>
<p class="pt-answer${d!=null&&d>=0&&d<=3?' soon':''}"><b>${esc(label??'보호 중')}</b>${a.until?` <span class="muted">· 공고 ${esc(a.until)}까지</span>`:''}<br><span class="muted">원래 보호자를 기다리는 기간이에요. 입양·문의는 보호소에 전화하세요.</span></p>
<div class="pt-actions">${tel?`<a href="${esc(telHref(tel))}">📞 보호소 전화</a>`:''}${sh?`<a class="sub" href="${placePath(sh.id)}">🏠 ${esc(sh.name)}</a>`:''}<a class="sub" href="${ANIMAL_SITE}" rel="noopener" target="_blank">국가동물보호정보시스템</a></div>
<dl class="pt-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div></div>
${others.length?`<section><h2>같은 보호소의 다른 아이들</h2><div class="pt-animals">${others.map(x=>animalCard(x)).join('')}</div></section>`:''}
<p><a class="pt-more-link" href="/adopt">내 주변 보호 중인 아이들 모두 보기 →</a></p>
<p class="muted small">출처: 농림축산검역본부 국가동물보호정보시스템(${esc(adata().status.updated_at.slice(0,10))} 기준). 그사이 입양되거나 보호자를 찾았을 수 있으니 보호소에 확인하세요.</p>
<script type="application/ld+json">${JSON.stringify(crumbs).replace(/</g,'\\u003c')}</script>`;
}
async function animalPage(a:Animal,url:URL,env:Env,ctx:ExecutionContext){
  const key=new Request(`${url.origin}/animal/${a.id}?v=${encodeURIComponent(adata().status.updated_at)}&t=1`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const title=`${animalTitle(a)||'보호 중인 동물'} · ${a.region_name} 보호 중 | 내근처 동물병원`;
  const desc=`${a.region_name} 보호소에서 보호 중인 ${a.kind??a.up??'동물'}${a.until?`(공고 ${a.until}까지)`:''}. ${a.mark??''}`.replace(/\s+/g,' ').trim().slice(0,160);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta name="robots" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<meta name="robots" content="noindex, follow"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/>${a.photo?`<meta property="og:image" content="${SITE}${photoPath(a.id)}"/>`:''}</head>`)
    .replace(/<div id="place-detail">PLACE_DETAIL<\/div>/,animalHtml(a))
    .replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=3600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}
/** 사진: 원본(http://openapi.animal.go.kr/…)을 받아 그대로 돌려줌(https 페이지에서 섞인 콘텐츠로 막히지 않게). 하루 캐시. */
async function photo(id:string){
  const a=animal(id);if(!a?.photo)return new Response('not found',{status:404});
  // 원본은 파일 내려받기 주소라 content-type이 이미지가 아닐 수 있음 → 확장자로 정함. 실패하면 x-photo-error에 이유.
  const ext=a.photo.match(/\.(jpe?g|png|gif|webp)(?:$|\?)/i)?.[1].toLowerCase();
  const guess=ext?`image/${ext==='jpg'?'jpeg':ext}`:'image/jpeg';
  const tried:string[]=[];
  for(const u of [a.photo,a.photo.replace(/^http:/,'https:')]){
    try{const r=await fetch(u,{cf:{cacheTtl:86400,cacheEverything:true},headers:{'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36','referer':'https://www.animal.go.kr/'}} as RequestInit);
      const type=r.headers.get('content-type')??'';tried.push(`${u.slice(0,5)} ${r.status} ${type}`);
      if(r.ok&&!/text\/html|json|xml/.test(type))return new Response(r.body,{headers:{'content-type':/^image\//.test(type)?type:guess,'cache-control':'public, max-age=86400'}});}catch(e){tried.push(`${u.slice(0,5)} ${String(e).slice(0,80)}`);}
  }
  return new Response('unavailable',{status:502,headers:{'cache-control':'public, max-age=600','x-photo-error':tried.join(' | ').replace(/[^\x20-\x7e]/g,'')}});
}
let centers:Map<string,WR>|null=null;
const center=(code:string)=>(centers??=new Map(WREG.map(r=>[r.code,r]))).get(code)??WREG.find(r=>r.code.slice(0,4)===code.slice(0,4));
function nearAnimals(type:string,lat:number,lon:number,radius:number){
  const list=type==='lost'?adata().lost:adata().animals;const out:(Animal&{km:number})[]=[];
  for(const a of list){const c=a.lat!=null?{lat:a.lat,lon:a.lon!}:center(a.region);if(!c)continue;
    const d=distKm(lat,lon,c.lat,c.lon);if(d<=radius)out.push({...a,km:Math.round(d*10)/10});}
  out.sort((x,y)=>x.km-y.km||(x.until??'9').localeCompare(y.until??'9'));
  return {total:out.length,items:out.slice(0,60)};
}

const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
function sitemap(path:string){
  const items=data().items,pages=Math.ceil(items.length/PER_SITEMAP);
  if(path==='/sitemap.xml')return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap>${Array.from({length:pages},(_,i)=>`<sitemap><loc>${SITE}/sitemap-places-${i+1}.xml</loc></sitemap>`).join('')}</sitemapindex>`);
  const m=path.match(/^\/sitemap-places-(\d+)\.xml$/);const i=m?+m[1]-1:-1;
  if(i<0||i>=pages)return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.slice(i*PER_SITEMAP,(i+1)*PER_SITEMAP).map(p=>`<url><loc>${SITE}${placePath(p.id)}</loc></url>`).join('')}</urlset>`);
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/fav'){const ids=[...new Set((p.get('ids')??'').split(','))].filter(x=>/^[0-9A-Za-z-]{2,40}$/.test(x)).slice(0,20);
        return json({items:ids.map(get).filter((x):x is Place=>!!x).map(x=>{const s=stateOf(x);return {id:x.id,state:s?.state??null,label:s?.label??x.sub??KINDS[x.kind].label,line:[x.region_name,x.tel].filter(Boolean).join(' · ')};})},200,60);}
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const kinds=(p.get('kind')??'').split(',').filter(k=>k in KINDS) as Kind[];
        const per=num(p.get('per'));
        const r=near(lat,lon,Math.max(.2,Math.min(50,num(p.get('km'))??2)),{limit:Math.max(1,Math.min(600,num(p.get('limit'))??120)),per:per?Math.max(1,Math.min(200,per)):undefined,kinds:kinds.length?kinds:null,sub:p.get('sub'),open:p.get('open')==='1'});
        return json({total:r.total,counts:r.counts,open:r.open,items:r.items.map(x=>({...slim(x),km:x.km}))},200,120);}
      if(url.pathname==='/api/search'){const q=flat(p.get('q')??'').slice(0,30);if(!q)return json({total:0,items:[]});
        const words=(p.get('q')??'').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4).map(flat);
        // '동물병원'·'24시'·'펫호텔' 같은 종류 낱말도 찾게 종류 이름을 함께 봄
        const hit=data().items.filter(x=>{const name=flat(x.name),where=flat(x.region_name+(x.addr??'')+(x.jibun??'')+KINDS[x.kind].title+(x.sub??''));return words.every(w=>name.includes(w)||where.includes(w));});
        const score=(x:Place)=>{const name=flat(x.name);return name.startsWith(q)?0:name.includes(q)?1:2+words.filter(w=>!name.includes(w)).length;};
        hit.sort((a,b)=>score(a)-score(b)||KIND_ORDER.indexOf(a.kind)-KIND_ORDER.indexOf(b.kind)||a.name.localeCompare(b.name));
        return json({total:hit.length,items:hit.slice(0,40).map(slim)},200,600);}
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/animals'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        return json(nearAnimals(p.get('type')==='lost'?'lost':'adopt',lat,lon,Math.max(1,Math.min(200,num(p.get('km'))??30))),200,600);}
      if(url.pathname==='/api/status')return json({status:data().status,animals:adata().status},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      if(url.pathname==='/sitemap.xml'||url.pathname.startsWith('/sitemap-places-')){const s=sitemap(url.pathname);if(s)return s;}
      const ph=url.pathname.match(/^\/photo\/([0-9A-Za-z]{3,30})$/);if(ph)return await photo(ph[1]);
      const am=url.pathname.match(/^\/animal\/(\d{6,20})\/?$/);
      if(am){const a=animal(am[1]);if(a&&!a.lost)return await animalPage(a,url,env,ctx);const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
      const m=url.pathname.match(/^\/place\/([a-z]-[0-9A-Za-z]{3,30})\/?$/);
      if(m){const x=get(m[1]);if(x)return await detail(x,url,env,ctx);}
      if(m||url.pathname==='/place/shell'||url.pathname==='/place/shell.html'||url.pathname.startsWith('/sitemap-places-')){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
