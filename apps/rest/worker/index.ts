// Cloudflare Worker for rest.guidejung.com (내근처 휴식). Static pages: ./out (Next.js export).
// The list ships with the Worker (data/places.json, scripts/collect-rest.py — 목욕장업·의료유사업(안마)·미용업(피부·세신);
// no database), imported as text (wrangler.jsonc rules) and parsed on first use.
// Routes: /api/near, /api/search, /api/fav, /api/where, /api/status, 상세 /shop/{id} (server-rendered into /shop/shell),
// /sitemap.xml (index) → /sitemap-pages.xml (Next) + /sitemap-shops-{n}.xml (here, 40,000 each).
import raw from '../data/places.json';
import weatherRegions from '../../weather/data/regions.json';
import {ADS,distKm,esc,eun,ro,KIND_ORDER,KINDS,km,mapUrl,naverUrl,shopPath,sinceLine,SITE,slim,telHref,years,type Kind,type Place} from '../lib/fmt';
import {actionsHtml} from '../../../packages/ui/src/actions';
import {blogHtml} from '../../../packages/ui/src/live';

interface Env{ASSETS:Fetcher}
type Data={status:{updated_at:string;count:number};items:Place[]};
let parsed:Data|null=null,byId:Map<string,Place>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const get=(id:string)=>(byId??=new Map(data().items.map(p=>[p.id,p]))).get(id);
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();
const PER_SITEMAP=40000;
type Near=Place&{km:number};

/** 반경 안 곳을 가까운 순으로. per를 주면 종류마다 per곳씩(피부관리실이 많아 다른 종류가 묻히지 않게), counts는 종류별 전체 수. */
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

// ---- detail page ----------------------------------------------------------------------------------------------------
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/shop/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});
type WR={code:string;name:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
function connectHtml(p:Place){
  if(p.lat==null||p.lon==null)return '';
  const r=WREG.reduce((x,y)=>distKm(p.lat!,p.lon!,y.lat,y.lon)<distKm(p.lat!,p.lon!,x.lat,x.lon)?y:x);
  const ll=`lat=${p.lat.toFixed(4)}&lon=${p.lon.toFixed(4)}`;
  const items:[string,string,string,string][]=[
    ['🅿️','근처 공영·무료 주차장','세울 곳과 1시간 예상 요금',`https://parking.guidejung.com/region/${r.name.includes(' ')?r.code.slice(0,4)+'0':r.code}`],
    ['🍽️','쉬고 나서 근처 맛집','1km 안 맛집·카페',`https://trip.guidejung.com/search?${ll}&radius_km=1&kind=food`],
    ['🌤️',`${r.name} 날씨`,'오늘·주말 날씨와 미세먼지',`https://weather.guidejung.com/region/${r.code}`],
    ['🚗','근처 가볼만한곳','20km 안 여행지·축제',`https://trip.guidejung.com/search?${ll}&radius_km=20`],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,h])=>`<a href="${esc(h)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const cardHtml=(c:Near)=>`<div class="rs-card"><a class="rs-card-main" href="${shopPath(c.id)}"><span class="rs-kind" aria-hidden="true">${KINDS[c.kind].icon}</span><span class="rs-card-body"><b>${esc(c.name)}</b><small><span class="rs-km">${esc(km(c.km))}</span>${c.sub?`<span class="rs-tag">${esc(c.sub)}</span>`:''}${esc(sinceLine(c.since)??'')}</small><small class="muted">${esc(c.addr??c.jibun??'')}</small></span></a><span class="rs-acts">${c.tel?`<a href="${esc(telHref(c.tel))}" aria-label="전화">📞</a>`:''}<a href="${esc(mapUrl(c))}" target="_blank" rel="noopener" aria-label="길찾기">🧭</a></span></div>`;
const ABOUT:Record<Kind,string>={
  sauna:'공중위생관리법의 목욕장업으로 시·군·구에 신고한 곳이에요.',
  private:'혼자 또는 일행끼리 쓰는 1인·프라이빗 목욕·세신 업소로 신고된 곳이에요.',
  anma:'의료법에 따라 안마사(시각장애인 중 시·도지사의 자격인정을 받은 사람)가 개설해 신고한 곳이에요.',
  skin:'공중위생관리법의 피부미용업으로 신고한 곳이에요. 의료기기·의약품을 쓰는 시술은 할 수 없어요.',
};

function detailHtml(p:Place,groups:[string,Near[]][]){
  const addr=p.addr??p.jibun,K=KINDS[p.kind],y=years(p.since);
  const what=[K.title,p.sub&&p.sub!==K.title?p.sub:null].filter(Boolean).join(' · ');
  const faq:[string,string][]=([
    [`${eun(p.name)} 어디에 있나요?`,addr?`${addr}에 있습니다${p.tel?`(전화 ${p.tel})`:''}.`:''],
    [`${eun(p.name)} 신고된 업소인가요?`,`네. ${p.region_name}에 ${p.since?`${ro(p.sub??K.title)}(신고일 ${p.since}${y?`, ${y}년째`:''})`:ro(p.sub??K.title)} 영업 신고가 된 곳입니다(행정안전부 지방행정 인허가데이터).`],
    [`${p.name} 가격과 영업 시간은?`,`공공데이터에는 가격·예약·영업 시간이 없습니다. 네이버 지도에서 ‘${p.name}’을 검색하거나${p.tel?` 전화(${p.tel})로`:''} 확인하세요.`],
  ] as [string,string][]).filter(([,x])=>x);
  const [sido,...rest]=p.region_name.split(' ');
  const ld={'@context':'https://schema.org','@type':K.ld,name:p.name,url:SITE+shopPath(p.id),image:SITE+'/og.png',
    ...(addr?{address:{'@type':'PostalAddress',streetAddress:addr,addressLocality:rest.join(' ')||sido,addressRegion:sido,addressCountry:'KR'}}:{}),
    ...(p.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:p.lat,longitude:p.lon}}:{}),...(p.tel?{telephone:p.tel}:{}),
    ...(p.since&&/^\d{4}-\d{2}-\d{2}$/.test(p.since)?{foundingDate:p.since}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 휴식',SITE+'/'],['지역별',SITE+'/region'],[p.region_name,`${SITE}/region/${p.region}`],[p.name,SITE+shopPath(p.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const facts:[string,string|null][]=[['구분',what],['도로명 주소',p.addr],['지번 주소',p.jibun],['전화',p.tel],['신고일',p.since?`${p.since}${y?` (${y}년째)`:''}`:null],
    ['시설',p.tags.join(' · ')||null],['기준',p.ref?`${p.ref} 갱신`:null],['지역',p.region_name]];
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별</a> › <a href="/region/${esc(p.region)}">${esc(p.region_name)}</a> › ${esc(p.name)}</nav>
<div class="rs-head"><h1>${K.icon} ${esc(p.name)}</h1><p>${esc([p.region_name,what].filter(Boolean).join(' · '))}</p></div>${actionsHtml({id:p.id,name:p.name,sub:[K.label,p.region_name].join(' · '),url:shopPath(p.id)})}
<p class="rs-answer"><b>${esc(ABOUT[p.kind])}</b>${addr?` <span class="muted">· ${esc(addr)}</span>`:''}${p.since?` <span class="muted">· ${esc(sinceLine(p.since)??'')}</span>`:''}</p>
<div class="rs-actions">${p.tel?`<a href="${esc(telHref(p.tel))}">📞 전화하기</a>`:''}<a class="${p.tel?'sub':''}" href="${esc(mapUrl(p))}" rel="noopener" target="_blank">🧭 길찾기</a><a class="naver" href="${esc(naverUrl(p))}" rel="noopener" target="_blank">🟢 네이버 지도에서 가격·예약 보기</a></div>
<p class="rs-note">가격·예약·영업 시간은 공공데이터에 없어요. 네이버 지도나 전화로 확인하세요.</p>
${p.kind==='sauna'||p.kind==='skin'?blogHtml(`${p.name} ${p.region_name.split(' ').slice(-1)[0]}`,p.name.replace(/\s*[([].*$/,'').trim(),'📝 다녀온 사람들 후기 · 네이버 블로그'):''}
${groups.map(([title,list])=>list.length?`<section><h2>${esc(title)}</h2><div class="rs-cards">${list.map(cardHtml).join('')}</div></section>`:'').join('')}
<p><a class="rs-more-link" href="/region/${esc(p.region)}/${p.kind}">${esc(p.region_name)} ${esc(K.label)} 모두 보기 →</a></p>
<section><h2>정보</h2><dl class="rs-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${connectHtml(p)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: 행정안전부 지방행정 인허가데이터(${esc(K.src)}). 정보가 다르면 관할 시·군·구청에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}`;
}

async function detail(p:Place,url:URL,env:Env,ctx:ExecutionContext){
  const key=new Request(`${url.origin}/shop/${p.id}?v=${encodeURIComponent(data().status.updated_at)}&a=${ADS?1:0}&t=1`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const at=(k:Kind,r:number,lim:number)=>p.lat!=null?near(p.lat,p.lon!,r,{limit:lim,kinds:[k],skip:p.id}).items:[];
  const K=KINDS[p.kind];
  const groups:[string,Near[]][]=[[`근처 다른 ${K.label}`,at(p.kind,p.kind==='private'||p.kind==='anma'?20:3,6)],
    ...KIND_ORDER.filter(k=>k!==p.kind&&k!=='skin').map(k=>[`근처 ${KINDS[k].label}`,at(k,k==='sauna'?3:10,3)] as [string,Near[]])];
  const title=p.kind==='anma'?`${p.name} 안마원·마사지 위치·전화 | 내근처 휴식`:`${p.name} ${K.label} 위치·전화 | 내근처 휴식`;
  const desc=`${p.region_name} ${p.name}(${[K.title,p.sub].filter(Boolean).join(' · ')}): ${p.addr??p.jibun??''} ${p.tel??''} · ${sinceLine(p.since)??''}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+shopPath(p.id);
  let html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png"/><meta property="og:site_name" content="내근처 휴식"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="shop-detail">SHOP_DETAIL<\/div>/,detailHtml(p,groups));
  if(ADS)html=html.replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=3600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
function sitemap(path:string){
  const items=data().items,pages=Math.ceil(items.length/PER_SITEMAP);
  if(path==='/sitemap.xml')return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap>${Array.from({length:pages},(_,i)=>`<sitemap><loc>${SITE}/sitemap-shops-${i+1}.xml</loc></sitemap>`).join('')}</sitemapindex>`);
  const m=path.match(/^\/sitemap-shops-(\d+)\.xml$/);const i=m?+m[1]-1:-1;
  if(i<0||i>=pages)return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items.slice(i*PER_SITEMAP,(i+1)*PER_SITEMAP).map(p=>`<url><loc>${SITE}${shopPath(p.id)}</loc></url>`).join('')}</urlset>`);
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/fav'){const ids=[...new Set((p.get('ids')??'').split(','))].filter(x=>/^[0-9A-Za-z-]{2,40}$/.test(x)).slice(0,20);
        return json({items:ids.map(get).filter((x):x is Place=>!!x).map(x=>({id:x.id,state:null,label:x.sub??KINDS[x.kind].label,line:[x.region_name,sinceLine(x.since)].filter(Boolean).join(' · ')}))},200,600);}
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const kinds=(p.get('kind')??'').split(',').filter(k=>k in KINDS) as Kind[];
        const per=num(p.get('per'));
        const r=near(lat,lon,Math.max(.2,Math.min(50,num(p.get('km'))??2)),{limit:Math.max(1,Math.min(200,num(p.get('limit'))??120)),per:per?Math.max(1,Math.min(60,per)):undefined,kinds:kinds.length?kinds:null});
        return json({total:r.total,counts:r.counts,items:r.items.map(x=>({...slim(x),km:x.km}))},200,300);}
      if(url.pathname==='/api/search'){const q=flat(p.get('q')??'').slice(0,30);if(!q)return json({total:0,items:[]});
        const words=(p.get('q')??'').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4).map(flat);
        // '찜질방'·'목욕탕'·'세신' 같은 종류 낱말도 찾게 종류 이름을 함께 봄
        const hit=data().items.filter(x=>{const name=flat(x.name),where=flat(x.region_name+(x.addr??'')+(x.jibun??'')+KINDS[x.kind].title+(x.sub??''));return words.every(w=>name.includes(w)||where.includes(w));});
        const score=(x:Place)=>{const name=flat(x.name);return name.startsWith(q)?0:name.includes(q)?1:2+words.filter(w=>!name.includes(w)).length;};
        hit.sort((a,b)=>score(a)-score(b)||KIND_ORDER.indexOf(a.kind)-KIND_ORDER.indexOf(b.kind)||a.name.localeCompare(b.name));
        return json({total:hit.length,items:hit.slice(0,40).map(slim)},200,600);}
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:data().status,ads:ADS},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      if(url.pathname==='/sitemap.xml'||url.pathname.startsWith('/sitemap-shops-')){const s=sitemap(url.pathname);if(s)return s;}
      const m=url.pathname.match(/^\/shop\/([a-z]-[0-9A-Za-z]{3,30})\/?$/);
      if(m){const x=get(m[1]);if(x)return await detail(x,url,env,ctx);}
      if(m||url.pathname==='/shop/shell'||url.pathname==='/shop/shell.html'||url.pathname.startsWith('/sitemap-shops-')){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
