// Cloudflare Worker for cvs.guidejung.com (내근처 편의점). Static pages: ./out (Next.js export).
// The list ships with the Worker (data/stores.json, scripts/collect-cvs.py — LOCALDATA 안전상비의약품 판매업소 + 가장 가까운
// 약국·응급실; no database), imported as text (wrangler.jsonc rules) and parsed on first use.
// Routes: /api/near, /api/search, /api/fav, /api/where, /api/status, 상세 /store/{id} (server-rendered into /store/shell),
// /sitemap.xml (index) → /sitemap-pages.xml (Next) + /sitemap-stores-{n}.xml (here, SITEMAP_STAGE까지, 40,000 each).
import raw from '../data/stores.json';
import weatherRegions from '../../weather/data/regions.json';
import {ADS,BRANDS,distKm,esc,eun,HOSPITAL,hm,km,mapUrl,meters,PHARMACY,phLine,SITE,SITEMAP_STAGE,slim,storePath,telHref,years,type BrandKey,type Store} from '../lib/fmt';
import {actionsHtml} from '../../../packages/ui/src/actions';

interface Env{ASSETS:Fetcher}
type Data={status:{updated_at:string;count:number};items:Store[]};
let parsed:Data|null=null,byId:Map<string,Store>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const get=(id:string)=>(byId??=new Map(data().items.map(p=>[p.id,p]))).get(id);
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();
const PER_SITEMAP=40000;
type Near=Store&{km:number};

/** 반경 안 매장을 가까운 순으로(브랜드로 거를 수 있음). */
function near(lat:number,lon:number,radius:number,opt:{limit?:number;brand?:BrandKey|null;skip?:string}){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180));
  const out:Near[]=[];
  for(const p of data().items){
    if(p.lat==null||p.id===opt.skip||Math.abs(p.lat-lat)>dLat||Math.abs(p.lon!-lon)>dLon)continue;
    if(opt.brand&&p.brand!==opt.brand)continue;
    const d=distKm(lat,lon,p.lat,p.lon!);if(d>radius)continue;
    out.push({...p,km:Math.round(d*100)/100});
  }
  out.sort((a,b)=>a.km-b.km);
  return {total:out.length,items:out.slice(0,opt.limit??60)};
}

// ---- detail page ----------------------------------------------------------------------------------------------------
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/store/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});
type WR={code:string;name:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
/** 내근처 지역 코드: 이름에 공백이 있는 일반구(수원시 장안구)는 시 코드로(약국·병원·주차장과 같은 규칙). */
const areaCode=(p:Store)=>{const r=p.lat!=null?WREG.reduce((x,y)=>distKm(p.lat!,p.lon!,y.lat,y.lon)<distKm(p.lat!,p.lon!,x.lat,x.lon)?y:x):null;return r?(r.name.includes(' ')?r.code.slice(0,4)+'0':r.code):p.region;};
function connectHtml(p:Store){
  const code=areaCode(p),r=WREG.find(x=>x.code===p.region);
  const items:[string,string,string,string][]=[
    ['💊',`${p.region_name} 지금 문 연 약국`,'영업 중·심야·일요일 약국',`${PHARMACY}/region/${code}`],
    ['🏥',`${p.region_name} 지금 진료하는 병원`,'야간·주말 진료, 응급실 남은 병상',`${HOSPITAL}/region/${code}`],
    ['🅿️','근처 공영·무료 주차장','세울 곳과 1시간 예상 요금',`https://parking.guidejung.com/region/${code}`],
    ['🌤️',`${r?.name??p.region_name} 날씨`,'오늘·내일 날씨와 미세먼지',`https://weather.guidejung.com/region/${p.region}`],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,h])=>`<a href="${esc(h)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const cardHtml=(c:Near)=>`<div class="cv-card"><a class="cv-card-main"${c.lat!=null&&c.lon!=null?` data-gj-pt="${c.lat},${c.lon}" data-gj-name="${esc(c.name)}"`:''} href="${storePath(c.id)}"><span class="cv-icon" aria-hidden="true">🏪</span><span class="cv-card-body"><b>${esc(c.name)}</b><small><span class="cv-km">${esc(km(c.km))}</span><span class="cv-tag">${esc(BRANDS[c.brand].label)}</span></small><small class="muted">${esc(c.addr??c.jibun??'')}</small></span></a>${c.tel?`<span class="cv-acts"><a href="${esc(telHref(c.tel))}" aria-label="전화">📞</a></span>`:''}</div>`;
/** 약국 지금 상태는 방문 때 내근처 약국 /api/fav로(상태 글자만 채움, 실패하면 빈칸). */
const PH_STATE=`<script>(function(){var els=document.querySelectorAll('[data-ph]');if(!els.length)return;var ids=[].map.call(els,function(e){return e.getAttribute('data-ph')}).join(',');
fetch('${PHARMACY}/api/fav?ids='+encodeURIComponent(ids)).then(function(r){return r.json()}).then(function(d){(d.items||[]).forEach(function(x){[].forEach.call(document.querySelectorAll('[data-ph="'+x.id+'"]'),function(e){e.textContent=x.label;e.className='cv-state '+x.state;});});}).catch(function(){});})();</script>`;

function detailHtml(p:Store,others:Near[]){
  const addr=p.addr??p.jibun,B=BRANDS[p.brand],y=years(p.since);
  const ph=p.ph,late=p.ph_late,er=p.er;
  const faq:[string,string][]=([
    [`${eun(p.name)} 어디에 있나요?`,addr?`${addr}에 있습니다${p.tel?`(전화 ${p.tel})`:''}.`:''],
    [`${p.name}에서 상비약을 살 수 있나요?`,`네. ${p.region_name}에 안전상비의약품 판매자로 등록된 곳입니다${p.since?`(등록일 ${p.since}${y?`, ${y}년째`:''})`:''}. 실제 판매 품목과 재고는 매장에 확인하세요.`],
    [`${eun(p.name)} 밤에도 여나요?`,'안전상비의약품 판매자로 등록하려면 24시간 연중 무휴 점포를 갖춰야 합니다(약사법 제44조의2). 실제 영업 시간은 바뀔 수 있으니 급하면 전화로 확인하세요.'],
    [`${p.name}에서 가장 가까운 약국은?`,ph?`${ph.name}(직선 ${meters(ph.m)})입니다${ph.close?`. 평일 보통 ${hm(ph.close)}까지 열고`:''}${ph.sun?' 일요일에도 엽니다':' 일요일에는 쉽니다'}.${late?` 평일 22시 넘어서까지 여는 가장 가까운 약국은 ${late.name}(${meters(late.m)}, ${hm(late.close)}까지)입니다.`:''}`:'3km 안에 약국이 없습니다.'],
  ] as [string,string][]).filter(([,x])=>x);
  const [sido,...rest]=p.region_name.split(' ');
  const ld={'@context':'https://schema.org','@type':'ConvenienceStore',name:p.name,url:SITE+storePath(p.id),image:SITE+'/og.png?v=2',
    ...(addr?{address:{'@type':'PostalAddress',streetAddress:addr,addressLocality:rest.join(' ')||sido,addressRegion:sido,addressCountry:'KR'}}:{}),
    ...(p.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:p.lat,longitude:p.lon}}:{}),...(p.tel?{telephone:p.tel}:{}),
    ...(p.brand!=='other'?{brand:{'@type':'Brand',name:B.title}}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 편의점',SITE+'/'],['지역별',SITE+'/region'],[p.region_name,`${SITE}/region/${p.region}`],[p.name,SITE+storePath(p.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const facts:[string,string|null][]=[['구분',`${B.title} · 안전상비의약품 판매자 등록`],['도로명 주소',p.addr??null],['지번 주소',p.jibun??null],['전화',p.tel??null],
    ['등록일',p.since?`${p.since}${y?` (${y}년째)`:''}`:null],['영업 면적',p.area?`${p.area}㎡`:null],['1km 안 약국',p.ph_n!=null?`${p.ph_n}곳`:null],
    ['500m 안 다른 상비약 편의점',p.n500!=null?`${p.n500}곳`:null],['지역',p.region_name]];
  const phItems=[
    ph?`<li>💊 가장 가까운 약국 <a href="${PHARMACY}/pharmacy/${esc(ph.id)}"><b>${esc(ph.name)}</b></a> <span class="muted">· ${meters(ph.m)}${ph.close?` · 평일 ${esc(hm(ph.close))}까지`:''} · ${ph.sun?'일요일 영업':'일요일 휴무'}</span><span data-ph="${esc(ph.id)}"></span></li>`:'<li>💊 3km 안에 약국이 없어요. 이 편의점의 상비약이 가장 가까운 선택일 수 있어요.</li>',
    late?`<li>🌙 평일 밤 10시 넘어서까지 여는 약국 <a href="${PHARMACY}/pharmacy/${esc(late.id)}"><b>${esc(late.name)}</b></a> <span class="muted">· ${meters(late.m)} · ${esc(hm(late.close))}까지</span><span data-ph="${esc(late.id)}"></span></li>`:'',
    er?`<li>🚑 가장 가까운 응급실 <a href="${HOSPITAL}/hospital/${esc(er.id)}"><b>${esc(er.name)}</b></a> <span class="muted">· ${meters(er.m)} · 실시간 남은 병상 보기</span></li>`:'',
  ].filter(Boolean).join('');
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별</a> › <a href="/region/${esc(p.region)}">${esc(p.region_name)}</a> › ${esc(p.name)}</nav>
<div class="cv-head"><h1>🏪 ${esc(p.name)}</h1><p>${esc([p.region_name,B.title,'상비약 판매 등록'].join(' · '))}</p></div>${actionsHtml({id:p.id,name:p.name,sub:[B.label,p.region_name].join(' · '),url:storePath(p.id)})}
<p class="cv-answer"><b>안전상비의약품 판매자로 등록된 곳이에요.</b> 등록 기준이 24시간 연중 무휴 점포라서 약국이 닫은 밤에도 해열진통제·소화제 같은 상비약을 살 수 있는 곳이에요.${addr?` <span class="muted">· ${esc(addr)}</span>`:''}</p>
<div class="cv-actions">${p.tel?`<a href="${esc(telHref(p.tel))}">📞 전화하기</a>`:''}<a class="${p.tel?'sub':''}" href="${esc(mapUrl(p))}" rel="noopener" target="_blank">🧭 길찾기</a></div>
<p class="cv-note">실제 영업 시간·판매 품목·재고는 공공데이터에 없어요. 급하면 전화로 확인하세요. 약은 사용상 주의사항을 꼭 읽고, 증상이 심하면 약국·병원에 문의하세요.</p>
<section class="cv-near-box"><h2>💊 이 근처 약국·응급실</h2><ul>${phItems}</ul></section>
${others.length?`<section><h2>근처 다른 상비약 편의점</h2><div class="cv-cards">${others.map(cardHtml).join('')}</div></section>`:''}
<p><a class="cv-more-link" href="/region/${esc(p.region)}">${esc(p.region_name)} 상비약 편의점 모두 보기 →</a></p>
<section><h2>정보</h2><dl class="cv-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${connectHtml(p)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: 행정안전부 지방행정 인허가데이터(안전상비의약품 판매업소), 국립중앙의료원(약국·응급실). 편의점 본사·가맹점과 관계없는 비공식 안내입니다. 정보가 다르면 관할 시·군·구청에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}${PH_STATE}`;
}

async function detail(p:Store,url:URL,env:Env,ctx:ExecutionContext){
  const key=new Request(`${url.origin}/store/${p.id}?v=${encodeURIComponent(data().status.updated_at)}&a=${ADS?1:0}&t=1`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const others=p.lat!=null?near(p.lat,p.lon!,1,{limit:6,skip:p.id}).items:[];
  const B=BRANDS[p.brand];
  const title=`${p.name} 상비약 판매 편의점 위치·전화 | 내근처 편의점`;
  const desc=`${p.region_name} ${p.name}(${B.title}): 안전상비의약품 판매 등록 매장. ${p.addr??p.jibun??''} ${p.tel??''} · 가장 가까운 약국 ${phLine(p)??'3km 안 없음'}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+storePath(p.id);
  let html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png?v=2"/><meta property="og:site_name" content="내근처 편의점"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="store-detail">STORE_DETAIL<\/div>/,detailHtml(p,others));
  if(ADS)html=html.replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=3600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
let mapped:Store[]|null=null;
const inMap=()=>mapped??=data().items.filter(p=>(p.stage??2)<=SITEMAP_STAGE);
function sitemap(path:string){
  const items=inMap(),pages=Math.ceil(items.length/PER_SITEMAP);
  if(path==='/sitemap.xml')return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap>${Array.from({length:pages},(_,i)=>`<sitemap><loc>${SITE}/sitemap-stores-${i+1}.xml</loc></sitemap>`).join('')}</sitemapindex>`);
  const m=path.match(/^\/sitemap-stores-(\d+)\.xml$/);const i=m?+m[1]-1:-1;
  if(i<0||i>=pages)return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.slice(i*PER_SITEMAP,(i+1)*PER_SITEMAP).map(p=>`<url><loc>${SITE}${storePath(p.id)}</loc></url>`).join('')}</urlset>`);
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/fav'){const ids=[...new Set((p.get('ids')??'').split(','))].filter(x=>/^[0-9A-Za-z-]{2,40}$/.test(x)).slice(0,20);
        return json({items:ids.map(get).filter((x):x is Store=>!!x).map(x=>({id:x.id,state:null,label:BRANDS[x.brand].label,line:[x.region_name,x.ph?`약국 ${meters(x.ph.m)}`:null].filter(Boolean).join(' · ')}))},200,600);}
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const b=p.get('brand') as BrandKey|null;
        const r=near(lat,lon,Math.max(.2,Math.min(30,num(p.get('km'))??1)),{limit:Math.max(1,Math.min(300,num(p.get('limit'))??60)),brand:b&&b in BRANDS?b:null});
        return json({total:r.total,items:r.items.map(x=>({...slim(x),km:x.km}))},200,300);}
      if(url.pathname==='/api/search'){const q=flat(p.get('q')??'').slice(0,30);if(!q)return json({total:0,items:[]});
        const words=(p.get('q')??'').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4).map(flat);
        const hit=data().items.filter(x=>{const name=flat(x.name),where=flat(x.region_name+(x.addr??'')+(x.jibun??'')+BRANDS[x.brand].title);return words.every(w=>name.includes(w)||where.includes(w));});
        const score=(x:Store)=>{const name=flat(x.name);return name.startsWith(q)?0:name.includes(q)?1:2+words.filter(w=>!name.includes(w)).length;};
        hit.sort((a,b)=>score(a)-score(b)||a.name.localeCompare(b.name));
        return json({total:hit.length,items:hit.slice(0,40).map(slim)},200,600);}
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:data().status,ads:ADS,sitemap_stage:SITEMAP_STAGE,in_sitemap:inMap().length},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      if(url.pathname==='/sitemap.xml'||url.pathname.startsWith('/sitemap-stores-')){const s=sitemap(url.pathname);if(s)return s;}
      const m=url.pathname.match(/^\/store\/(c-[0-9A-Za-z]{3,40})\/?$/);
      if(m){const x=get(m[1]);if(x)return await detail(x,url,env,ctx);}
      if(m||url.pathname.startsWith('/store/')||url.pathname.startsWith('/sitemap-stores-')){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
