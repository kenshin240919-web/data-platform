// Cloudflare Worker for service.guidejung.com (내근처 서비스센터). Static pages: ./out (Next.js export).
// The list ships with the Worker (data/centers.json, scripts/collect-service.py — repair shops, inspection stations, car washes,
// emission repair; no database), imported as text (wrangler.jsonc rules) and parsed on first use.
// Routes: /api/near, /api/search, /api/where, /api/status, 상세 /center/{id} (server-rendered into /center/shell),
// /sitemap.xml (index) → /sitemap-pages.xml (Next) + /sitemap-centers-{n}.xml (here, 40,000 each).
import raw from '../data/centers.json';
import weatherRegions from '../../weather/data/regions.json';
import {centerPath,distKm,esc,eun,hoursLine,KIND_LABEL,KINDS,km,kstNow,mapUrl,openNow,REPAIR_INFO,SITE,slim,years,type Center,type Kind} from '../lib/fmt';

interface Env{ASSETS:Fetcher}
type Data={status:{updated_at:string;count:number};items:Center[]};
let parsed:Data|null=null,byId:Map<string,Center>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const get=(id:string)=>(byId??=new Map(data().items.map(p=>[p.id,p]))).get(id);
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();
const PER_SITEMAP=40000;

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
const CHECK=[['견적서를 먼저 받으세요','정비업자는 점검·정비 견적서를 발급할 의무가 있어요.'],['두세 곳 견적을 비교하세요','한국소비자원 권고'],['부품을 확인하세요','정품·중고·재생 부품 여부를 견적서에'],['수리 기간을 적어 두세요',''],['명세서를 보관하세요','같은 고장이 다시 생기면 보증 수리 요청'],['분쟁은 1372','한국소비자원 소비자상담센터']];
const DAY_LD={wk:['Monday','Tuesday','Wednesday','Thursday','Friday'],sat:['Saturday'],hol:['Sunday','PublicHolidays']} as const;

function detailHtml(p:Center,groups:[string,(Center&{km:number})[]][]){
  const now=kstNow(),o=openNow(p,now),addr=p.addr??p.jibun,K=KINDS[p.kind],y=years(p.since);
  const subInfo=p.kind==='repair'&&p.sub?REPAIR_INFO[p.sub]:null;
  const faq:[string,string][]=([
    [`${eun(p.name)} 어디에 있나요?`,addr?`${addr}에 있습니다${p.tel?`(전화 ${p.tel})`:''}.`:''],
    [`${p.name} 영업 시간은?`,p.hours_text??(hoursLine(p)!=='운영 시간 정보 없음'?`${hoursLine(p)}입니다(지자체 등록 기준).`:'등록된 영업 시간이 없습니다. 가기 전에 전화로 확인하세요.')],
    [`${eun(p.name)} 어떤 곳인가요?`,p.kind==='repair'?`${p.sub?`${p.sub}업체로, ${subInfo??''}`:'자동차 정비업체'}입니다${y?`(등록 ${y}년째)`:''}.`:p.kind==='inspect'?`${p.sub??''} 자동차 검사소로, ${p.tags.join('·')||'정기검사'}를 합니다.`:p.kind==='wash'?`세차장${p.sub?`(${p.sub})`:''}입니다${p.fee?` — 요금: ${p.fee}`:''}.`:`${p.sub??'배출가스 정비'} 업체입니다.`],
  ] as [string,string][]).filter(([,x])=>x);
  const spec=(Object.keys(DAY_LD) as (keyof typeof DAY_LD)[]).filter(k=>p.hours[k]).map(k=>({'@type':'OpeningHoursSpecification',dayOfWeek:DAY_LD[k].map(d=>`https://schema.org/${d}`),opens:p.hours[k]![0],closes:p.hours[k]![1]==='24:00'?'23:59':p.hours[k]![1]}));
  const [sido,...rest]=p.region_name.split(' ');
  const ld={'@context':'https://schema.org','@type':K.ld,name:p.name,url:SITE+centerPath(p.id),image:SITE+'/og.png',
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
<div class="sv-head"><h1>${K.icon} ${esc(p.name)}</h1><p>${esc([p.region_name,K.title,p.sub].filter(Boolean).join(' · '))}</p></div>
<p class="sv-answer ${o?(o.open?'open':'closed'):''}">${o?`<span class="sv-dot" aria-hidden="true"></span><b>${esc(o.label)}</b> <span class="muted">· ${esc(KIND_LABEL[now.kind])}</span>`:`<b>${esc(subInfo??K.desc)}</b>`}${addr?` <span class="muted">· ${esc(addr)}</span>`:''}</p>
<div class="sv-actions">${p.tel?`<a href="tel:${esc(p.tel.replace(/[^0-9]/g,''))}">📞 전화하기</a>`:''}<a class="${p.tel?'sub':''}" href="${esc(mapUrl(p))}" rel="noopener" target="_blank">🧭 길찾기</a>${p.kind==='inspect'?'<a class="sub" href="/inspection">🗓️ 과태료 계산기</a>':''}</div>
${p.kind==='inspect'&&p.tags.length?`<section><h2>이곳에서 받을 수 있는 검사</h2><div class="sv-tags">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></section>`:''}
${Object.keys(p.hours).length?`<section><h2>영업 시간</h2><table class="sv-hours"><tbody>${(['wk','sat','hol'] as const).map(k=>{const h=p.hours[k];return `<tr${k===now.kind?' class="today"':''}><th>${KIND_LABEL[k]}${k===now.kind?' (오늘)':''}</th><td>${h?`${esc(h[0])} ~ ${esc(h[1])}`:'<span class="muted">정보 없음</span>'}</td></tr>`;}).join('')}</tbody></table><p class="muted small">지자체에 등록된 시간이에요. 점심시간·임시 휴무는 다를 수 있어요.</p></section>`:`<p class="sv-note">등록된 영업 시간이 없어요. 가기 전에 ${p.tel?'전화로 ':''}확인하세요.</p>`}
${p.kind==='repair'||p.kind==='emission'?`<section class="sv-guide"><h2>✅ 맡기기 전 체크리스트</h2><ol>${CHECK.map(([t,d])=>`<li><b>${esc(t)}</b>${d?`<span>${esc(d)}</span>`:''}</li>`).join('')}</ol><p><a class="sv-more-link" href="/guide">정비소 종류·고르는 법 자세히 →</a></p></section>`:''}
${groups.map(([title,list])=>list.length?`<section><h2>${esc(title)}</h2><div class="sv-cards">${list.map(cardHtml).join('')}</div></section>`:'').join('')}
<p><a class="sv-more-link" href="/region/${esc(p.region)}">${esc(p.region_name)} 정비소·검사소 모두 보기 →</a></p>
<section><h2>정보</h2><dl class="sv-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${connectHtml(p)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: ${p.kind==='repair'?'전국자동차정비업체표준데이터':p.kind==='inspect'?'전국자동차검사소표준데이터':p.kind==='wash'?'지방행정 인허가데이터(세차장정보)':'지방행정 인허가데이터(배출가스전문정비사업자·확인검사대행자)'}(${esc(p.org??'지자체')}). 정보가 다르면 관할 시·군·구청에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}`;
}

async function detail(p:Center,url:URL,env:Env,ctx:ExecutionContext){
  const key=new Request(`${url.origin}/center/${p.id}?b=${Math.floor(Date.now()/600e3)}&v=${encodeURIComponent(data().status.updated_at)}&t=1`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const at=(k:Kind,r:number,lim:number)=>p.lat!=null?near(p.lat,p.lon!,r,lim,[k],p.id).items:[];
  const groups:[string,(Center&{km:number})[]][]=p.kind==='inspect'?[['근처 다른 검사소',at('inspect',20,4)],['근처 정비소',at('repair',2,6)]]
    :p.kind==='wash'?[['근처 다른 세차장',at('wash',3,6)],['근처 정비소',at('repair',2,4)]]
    :[[p.kind==='repair'?'근처 다른 정비소':'근처 정비소',at('repair',2,6)],['가까운 자동차 검사소',at('inspect',20,3)],['근처 세차장',at('wash',3,3)]];
  const K=KINDS[p.kind];
  const title=`${p.name} ${p.kind==='repair'?'정비소':K.label} 위치·전화·영업 시간 | 내근처 서비스센터`;
  const desc=`${p.region_name} ${p.name}(${[K.title,p.sub].filter(Boolean).join(' · ')}): ${p.addr??p.jibun??''} ${p.tel??''} · ${p.hours_text??hoursLine(p)}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+centerPath(p.id);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png"/><meta property="og:site_name" content="내근처 서비스센터"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="center-detail">CENTER_DETAIL<\/div>/,detailHtml(p,groups))
    .replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
function sitemap(path:string){
  const items=data().items,pages=Math.ceil(items.length/PER_SITEMAP);
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
        const r=near(lat,lon,Math.max(.2,Math.min(30,num(p.get('km'))??2)),Math.max(1,Math.min(150,num(p.get('limit'))??40)),kinds.length?kinds:null);
        return json({total:r.total,items:r.items.map(x=>({...slim(x),km:x.km}))},200,300);}
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
