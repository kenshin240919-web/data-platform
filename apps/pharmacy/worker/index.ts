// Cloudflare Worker for pharmacy.guidejung.com (내근처 약국). Static pages: ./out (Next.js export).
// The pharmacy list ships with the Worker (data/pharmacies.json, scripts/collect-pharmacy.py, about 25,000 — no database),
// imported as text (wrangler.jsonc rules) and parsed on first use. '지금 영업 중' is computed from the hours per request.
// Routes: /api/near, /api/search, /api/where, /api/status, 약국 상세 /pharmacy/{hpid} (server-rendered into /pharmacy/shell).
import raw from '../data/pharmacies.json';
import weatherRegions from '../../weather/data/regions.json';
import {DAY_LABEL,esc,eun,hm,km,kstNow,late,pharmacyPath,SITE,statusOf,sunday,holidayOpen,weekLine,type Card,type Pharmacy} from '../lib/fmt';

interface Env{ASSETS:Fetcher}
type Data={status:{updated_at:string;count:number};items:Pharmacy[]};
let parsed:Data|null=null,byId:Map<string,Pharmacy>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const get=(id:string)=>(byId??=new Map(data().items.map(p=>[p.id,p]))).get(id);
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();
const TESTS:Record<string,(p:Pharmacy)=>boolean>={open:p=>statusOf(p).state!=='closed',night:late,sunday,holiday:holidayOpen};

function near(lat:number,lon:number,radius:number,cond:string|null,limit:number,skip?:string){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180)),test=cond?TESTS[cond]:null,now=kstNow();
  const out:Card[]=[];
  for(const p of data().items){
    if(p.lat==null||p.id===skip||Math.abs(p.lat-lat)>dLat||Math.abs(p.lon!-lon)>dLon)continue;
    const d=distKm(lat,lon,p.lat,p.lon!);if(d>radius)continue;
    if(test&&!(cond==='open'?statusOf(p,now).state!=='closed':test(p)))continue;
    out.push({...p,km:Math.round(d*100)/100});
  }
  out.sort((a,b)=>a.km!-b.km!);
  return {total:out.length,items:out.slice(0,limit)};
}

// ---- detail page ----------------------------------------------------------------------------------------------------
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/pharmacy/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});
type WR={code:string;name:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
function connectHtml(p:Pharmacy){
  if(p.lat==null||p.lon==null)return '';
  const r=WREG.reduce((x,y)=>distKm(p.lat!,p.lon!,y.lat,y.lon)<distKm(p.lat!,p.lon!,x.lat,x.lon)?y:x),ll=`lat=${p.lat.toFixed(4)}&lon=${p.lon.toFixed(4)}`;
  const items:[string,string,string,string][]=[
    ['🌤️',`${p.region_name} 날씨`,'비·미세먼지·기온 미리 확인',`https://weather.guidejung.com/region/${r.code}`],
    ['🚗','근처 가볼만한곳·맛집','5km 안 여행지와 맛집',`https://trip.guidejung.com/search?${ll}&radius_km=5`],
    ['🏫','우리 학교 오늘 급식','학교 이름으로 급식·학사일정 찾기','https://school.guidejung.com/search'],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,h])=>`<a href="${esc(h)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const LD_DAY:Record<string,string>={'1':'Monday','2':'Tuesday','3':'Wednesday','4':'Thursday','5':'Friday','6':'Saturday','7':'Sunday'};
const cardHtml=(c:Card)=>{const s=statusOf(c);return `<a class="ph-card ${s.state}" href="${pharmacyPath(c.id)}"><span class="ph-dot" aria-hidden="true"></span><span class="ph-card-body"><b>${esc(c.name)}</b><small>${c.km!=null?`${esc(km(c.km))} · `:''}${esc(s.label)}</small></span></a>`;};

function detailHtml(p:Pharmacy,nearby:Card[]){
  const now=kstNow(),s=statusOf(p,now);
  const days=['1','2','3','4','5','6','7','8'];
  const todayKey=now.holiday?'8':now.day;
  const faq:[string,string][]=([
    [`${p.name} 지금 영업하나요?`,`${s.state==='closed'?'지금은 영업 시간이 아닙니다':'지금 영업 중입니다'}(${s.label}). 요일별 시간: ${weekLine(p)}${p.hours['8']?` · 공휴일 ${hm(p.hours['8'][0])}~${hm(p.hours['8'][1])}`:''}.`],
    [`${p.name} 일요일에도 여나요?`,p.hours['7']?`네, 일요일 ${hm(p.hours['7'][0])}~${hm(p.hours['7'][1])}에 엽니다.`:'등록된 일요일 운영 시간이 없습니다(휴무로 봅니다).'],
    [`${p.name} 공휴일에도 여나요?`,p.hours['8']?`네, 공휴일 ${hm(p.hours['8'][0])}~${hm(p.hours['8'][1])}에 엽니다.`:'등록된 공휴일 운영 시간이 없습니다(휴무로 봅니다).'],
    [`${eun(p.name)} 어디에 있나요?`,p.address?`${p.address}에 있습니다${p.tel?`(전화 ${p.tel})`:''}.`:''],
  ] as [string,string][]).filter(([,x])=>x);
  const spec=Object.entries(p.hours).filter(([d])=>LD_DAY[d]).map(([d,[o,c]])=>({'@type':'OpeningHoursSpecification',dayOfWeek:`https://schema.org/${LD_DAY[d]}`,opens:hm(o).replace('새벽 ',''),closes:hm(c).replace('새벽 ','')}));
  const ld={'@context':'https://schema.org','@type':'Pharmacy',name:p.name,url:SITE+pharmacyPath(p.id),image:SITE+'/og.png',
    ...(p.address?{address:{'@type':'PostalAddress',streetAddress:p.address,addressLocality:p.region_name.split(' ').slice(1).join(' ')||p.region_name,addressRegion:p.region_name.split(' ')[0],postalCode:p.zip??undefined,addressCountry:'KR'}}:{}),
    ...(p.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:p.lat,longitude:p.lon}}:{}),...(p.tel?{telephone:p.tel}:{}),...(spec.length?{openingHoursSpecification:spec}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 약국',SITE+'/'],['지역별 약국',SITE+'/region'],[p.region_name,`${SITE}/region/${p.region}`],[p.name,SITE+pharmacyPath(p.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const map=p.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:p.address?`https://map.kakao.com/?q=${encodeURIComponent(p.address)}`:null;
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별 약국</a> › <a href="/region/${esc(p.region)}">${esc(p.region_name)}</a> › ${esc(p.name)}</nav>
<div class="ph-head"><h1>${esc(p.name)}</h1><p>${esc([p.region_name,p.address].filter(Boolean).join(' · '))}</p></div>
<p class="ph-answer ${s.state}"><span class="ph-dot" aria-hidden="true"></span><b>${esc(s.label)}</b>${s.today?` <span class="muted">· 오늘 ${esc(s.today)}</span>`:''}</p>
<div class="ph-actions">${p.tel?`<a href="tel:${esc(p.tel.replace(/[^0-9]/g,''))}">📞 전화하기</a>`:''}${map?`<a class="sub" href="${esc(map)}" rel="noopener" target="_blank">🧭 길찾기</a>`:''}</div>
<section><h2>요일별 운영 시간</h2><table class="ph-hours"><tbody>${days.map(d=>{const h=p.hours[d];return `<tr${d===todayKey?' class="today"':''}><th>${DAY_LABEL[d]}${d===todayKey?' (오늘)':''}</th><td>${h?`${esc(hm(h[0]))} ~ ${esc(hm(h[1]))}`:'<span class="muted">휴무</span>'}</td></tr>`;}).join('')}</tbody></table>
<p class="muted small">약국이 국립중앙의료원에 신고한 시간입니다. 명절·임시 휴무는 다를 수 있으니 가기 전에 전화로 확인하세요.</p></section>
${nearby.length?`<section><h2>근처 다른 약국 <span class="muted">${nearby.some(c=>statusOf(c).state!=='closed')?'지금 문 연 곳 · 가까운 순':'가까운 순'}</span></h2><div class="ph-cards">${nearby.map(cardHtml).join('')}</div><p><a class="ph-more-link" href="/region/${esc(p.region)}">${esc(p.region_name)} 약국 모두 보기 →</a></p></section>`:''}
<section><h2>약국 정보</h2><dl class="ph-facts">${([['주소',p.address],['전화',p.tel],['우편번호',p.zip],['지역',p.region_name]] as [string,string|null][]).filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${connectHtml(p)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: 국립중앙의료원 전국 약국 정보 조회 서비스(공공데이터포털). 잘못된 정보는 관할 보건소에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}`;
}

async function detail(p:Pharmacy,url:URL,env:Env,ctx:ExecutionContext){
  // 영업 상태가 시각에 따라 바뀌므로 5분 단위로 새로 만듦.
  const key=new Request(`${url.origin}/pharmacy/${p.id}?b=${Math.floor(Date.now()/300e3)}&v=${encodeURIComponent(data().status.updated_at)}&t=1`);
  const hit=await caches.default.match(key);if(hit)return hit;
  // 근처 약국은 지금 문 연 곳 먼저(밤·휴일에 바로 갈 곳), 없으면 가까운 순.
  const openNear=p.lat!=null?near(p.lat,p.lon!,5,'open',6,p.id).items:[];
  const nearby=openNear.length?openNear:p.lat!=null?near(p.lat,p.lon!,3,null,6,p.id).items:[];
  const title=`${p.name} 운영 시간·지금 영업 | 내근처 약국`;
  const desc=`${p.region_name} ${p.name}: ${weekLine(p)}${p.hours['8']?` · 공휴일 ${hm(p.hours['8'][0])}~${hm(p.hours['8'][1])}`:''}. ${p.address??''} ${p.tel??''}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+pharmacyPath(p.id);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png"/><meta property="og:site_name" content="내근처 약국"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="pharmacy-detail">PHARMACY_DETAIL<\/div>/,detailHtml(p,nearby))
    .replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const cond=p.get('cond');return json(near(lat,lon,Math.max(.3,Math.min(20,num(p.get('km'))??2)),cond&&TESTS[cond]?cond:null,Math.max(1,Math.min(50,num(p.get('limit'))??20))));}
      if(url.pathname==='/api/search'){const q=flat(p.get('q')??'').slice(0,30);if(!q)return json({total:0,items:[]});
        const words=(p.get('q')??'').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4).map(flat);
        const hit=data().items.filter(x=>{const name=flat(x.name),where=flat(x.region_name+(x.address??''));return words.every(w=>name.includes(w)||where.includes(w));});
        const score=(x:Pharmacy)=>{const name=flat(x.name);return name.startsWith(q)?0:name.includes(q)?1:2+words.filter(w=>!name.includes(w)).length;};
        hit.sort((a,b)=>score(a)-score(b)||a.name.localeCompare(b.name));
        return json({total:hit.length,items:hit.slice(0,30)},200,600);}
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:data().status,now:kstNow()},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      const m=url.pathname.match(/^\/pharmacy\/([0-9A-Z]{5,12})\/?$/);
      if(m){const x=get(m[1]);if(x)return await detail(x,url,env,ctx);}
      if(url.pathname==='/pharmacy/shell'||url.pathname==='/pharmacy/shell.html'||m){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
