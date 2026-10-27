// Cloudflare Worker for parking.guidejung.com (내근처 주차장). Static pages: ./out (Next.js export).
// The lot list ships with the Worker (data/parkings.json, scripts/collect-parking.py, about 18,000 — no database),
// imported as text (wrangler.jsonc rules) and parsed on first use. Fees for '몇 시간' are computed in lib/fmt.ts.
// Routes: /api/near, /api/search, /api/where, /api/status, 주차장 상세 /parking/{관리번호} (server-rendered into /parking/shell).
import raw from '../data/parkings.json';
import weatherRegions from '../../weather/data/regions.json';
import {allDay,distKm,esc,eun,feeFor,feeLine,hoursLine,km,kstNow,KIND_LABEL,lotPath,mapUrl,n,openNow,SITE,slim,won,type Lot} from '../lib/fmt';
import {actionsHtml} from '../../../packages/ui/src/actions';
import {aroundHtml} from '../../../packages/ui/src/live';

interface Env{ASSETS:Fetcher}
type Data={status:{updated_at:string;count:number};items:Lot[]};
let parsed:Data|null=null,byId:Map<string,Lot>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const get=(id:string)=>(byId??=new Map(data().items.map(p=>[p.id,p]))).get(id);
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();

function near(lat:number,lon:number,radius:number,limit:number,skip?:string,free=false){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180));
  const out:(Lot&{km:number})[]=[];
  for(const p of data().items){
    if(p.lat==null||p.id===skip||Math.abs(p.lat-lat)>dLat||Math.abs(p.lon!-lon)>dLon)continue;
    if(free&&p.charge!=='무료')continue;
    const d=distKm(lat,lon,p.lat,p.lon!);if(d>radius)continue;
    out.push({...p,km:Math.round(d*100)/100});
  }
  out.sort((a,b)=>a.km-b.km);
  return {total:out.length,items:out.slice(0,limit)};
}

// ---- detail page ----------------------------------------------------------------------------------------------------
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/parking/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});
type WR={code:string;name:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
function connectHtml(p:Lot){
  if(p.lat==null||p.lon==null)return '';
  const r=WREG.reduce((x,y)=>distKm(p.lat!,p.lon!,y.lat,y.lon)<distKm(p.lat!,p.lon!,x.lat,x.lon)?y:x),ll=`lat=${p.lat.toFixed(4)}&lon=${p.lon.toFixed(4)}`;
  const items:[string,string,string,string][]=[
    ['🚗','근처 가볼만한곳','2km 안 여행지·볼거리',`https://trip.guidejung.com/search?${ll}&radius_km=2&kind=place,festival`],
    ['🍽️','근처 맛집','1km 안 맛집',`https://trip.guidejung.com/search?${ll}&radius_km=1&kind=food`],
    ['🌤️',`${p.region_name} 날씨`,'비·미세먼지 미리 확인',`https://weather.guidejung.com/region/${r.code}`],
    ['⚡','근처 전기차 충전소','지금 충전 가능한 곳',`https://charge.guidejung.com/region/${r.name.includes(' ')?r.code.slice(0,4)+'0':r.code}`],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,h])=>`<a href="${esc(h)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const cardHtml=(c:Lot&{km:number})=>{const w=feeFor(c,60);return `<a class="pk-card" href="${lotPath(c.id)}"><span class="pk-card-body"><b>${esc(c.name)}</b><small>${esc(km(c.km))} · ${esc(c.type==='노상'?'길가':c.type??'')}${c.spaces?` · ${n(c.spaces)}면`:''}</small><small class="muted">${esc(feeLine(c))}</small></span><span class="pk-price">${w===0?'<b class="pk-free">무료</b>':w!=null?`<b class="pk-fee">${n(w)}원</b><small>1시간 예상</small>`:'<span class="pk-unknown">요금 확인</span>'}</span></a>`;};
const TIMES=[30,60,120,180,240,480];
const DAY_LD={wk:['Monday','Tuesday','Wednesday','Thursday','Friday'],sat:['Saturday'],hol:['Sunday','PublicHolidays']} as const;

function detailHtml(p:Lot,nearby:(Lot&{km:number})[]){
  const now=kstNow(),o=openNow(p,now),addr=p.addr??p.jibun;
  const h1=feeFor(p,60),h2=feeFor(p,120);
  const faq:[string,string][]=([
    [`${p.name} 주차 요금은 얼마인가요?`,p.charge==='무료'?'무료 주차장입니다.':`${feeLine(p)}${h1!=null&&h1>0?`. 1시간 세우면 약 ${n(h1)}원${h2!=null?`, 2시간은 약 ${n(h2)}원`:''}입니다`:''}.`],
    [`${p.name} 운영 시간은?`,`${hoursLine(p)}${p.days?`(운영 요일: ${p.days})`:''}.`],
    [`${p.name} 주차면은 몇 면인가요?`,p.spaces?`${n(p.spaces)}면입니다${p.type?`(${p.type} 주차장)`:''}.`:''],
    [`${eun(p.name)} 어디에 있나요?`,addr?`${addr}에 있습니다${p.tel?`(문의 ${p.tel})`:''}.`:''],
  ] as [string,string][]).filter(([,x])=>x);
  const spec=(Object.keys(DAY_LD) as (keyof typeof DAY_LD)[]).filter(k=>p.hours[k]).map(k=>({'@type':'OpeningHoursSpecification',dayOfWeek:DAY_LD[k].map(d=>`https://schema.org/${d}`),opens:p.hours[k]![0],closes:p.hours[k]![1]==='24:00'?'23:59':p.hours[k]![1]}));
  const [sido,...rest]=p.region_name.split(' ');
  const ld={'@context':'https://schema.org','@type':'ParkingFacility',name:p.name,url:SITE+lotPath(p.id),image:SITE+'/og.png',
    ...(addr?{address:{'@type':'PostalAddress',streetAddress:addr,addressLocality:rest.join(' ')||sido,addressRegion:sido,addressCountry:'KR'}}:{}),
    ...(p.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:p.lat,longitude:p.lon}}:{}),...(p.tel?{telephone:p.tel}:{}),...(spec.length?{openingHoursSpecification:spec}:{}),
    isAccessibleForFree:p.charge==='무료',...(p.charge!=='무료'?{priceRange:feeLine(p)}:{}),...(p.spaces?{maximumAttendeeCapacity:p.spaces}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 주차장',SITE+'/'],['지역별 주차장',SITE+'/region'],[p.region_name,`${SITE}/region/${p.region}`],[p.name,SITE+lotPath(p.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const facts:[string,string|null][]=[['구분',[p.se,p.type&&`${p.type}${p.type==='노상'?'(길가)':''}`].filter(Boolean).join(' · ')||null],['주차면',p.spaces?`${n(p.spaces)}면`:null],
    ['도로명 주소',p.addr],['지번 주소',p.jibun],['결제 방법',p.pay],['장애인 전용 구획',p.dis?'있음':null],['특기사항',p.note],['관리기관',p.org],['전화',p.tel],['기준일',p.ref],['지역',p.region_name]];
  const fee=p.fee;
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별 주차장</a> › <a href="/region/${esc(p.region)}">${esc(p.region_name)}</a> › ${esc(p.name)}</nav>
<div class="pk-head"><h1>${esc(p.name)}</h1><p>${esc([p.region_name,p.se&&`${p.se} 주차장`,addr].filter(Boolean).join(' · '))}</p></div>${actionsHtml({id:p.id,name:p.name,sub:p.region_name,url:lotPath(p.id)})}
<p class="pk-answer ${o.open?'open':'closed'}"><span class="pk-dot" aria-hidden="true"></span><b>${p.charge==='무료'?'무료 주차장':h1!=null?`1시간 약 ${esc(won(h1))}`:esc(feeLine(p))}</b> <span class="muted">· ${esc(KIND_LABEL[now.kind])} ${esc(o.label)}${p.spaces?` · ${n(p.spaces)}면`:''}</span></p>
<div class="pk-actions"><a href="${esc(mapUrl(p))}" rel="noopener" target="_blank">🧭 길찾기</a>${p.tel?`<a class="sub" href="tel:${esc(p.tel.replace(/[^0-9]/g,''))}">📞 관리기관 전화</a>`:''}</div>
<section><h2>주차 요금</h2>${p.charge==='무료'?'<p><b class="pk-free">무료</b> 주차장이에요.</p>':`<table class="pk-feetable"><tbody>
${fee?.b?`<tr><th>기본</th><td>${esc(`${fee.b[0]}분 ${n(fee.b[1])}원`)}</td></tr>`:''}${fee?.a?`<tr><th>추가</th><td>${esc(`${fee.a[0]}분마다 ${n(fee.a[1])}원`)}</td></tr>`:''}${fee?.d?`<tr><th>1일 주차권</th><td>${n(fee.d)}원${fee.dh?` (${fee.dh}시간)`:''}</td></tr>`:''}${fee?.m?`<tr><th>월 정기권</th><td>${n(fee.m)}원</td></tr>`:''}
${TIMES.map(t=>{const w=feeFor(p,t);return w!=null?`<tr><th>${t<60?`${t}분`:`${t/60}시간`} 세우면</th><td><b>약 ${esc(won(w))}</b></td></tr>`:'';}).join('')}
</tbody></table>${!fee?'<p class="pk-unknown">등록된 요금 정보가 없어요. 현장 안내판을 확인하세요.</p>':''}${p.charge==='혼합'?'<p class="muted small">일부 시간·구역은 무료인 주차장이에요.</p>':''}`}
<p class="muted small">지자체가 등록한 요금으로 계산한 예상 금액이에요. 할인(경차·친환경차 등)·시간대별 요금은 반영하지 않았어요.</p></section>
<section><h2>운영 시간</h2><table class="pk-hours"><tbody>${(['wk','sat','hol'] as const).map(k=>{const h=p.hours[k];return `<tr${k===now.kind?' class="today"':''}><th>${KIND_LABEL[k]}${k===now.kind?' (오늘)':''}</th><td>${h?h[0]==='00:00'&&(h[1]==='23:59'||h[1]==='24:00')?'24시간':`${esc(h[0])} ~ ${esc(h[1])}`:'<span class="muted">운영 안 함</span>'}</td></tr>`;}).join('')}</tbody></table>${allDay(p)?'':''}</section>
${nearby.length?`<section><h2>근처 다른 주차장 <span class="muted">1시간 싼 순</span></h2><div class="pk-cards">${nearby.map(cardHtml).join('')}</div><p><a class="pk-more-link" href="/region/${esc(p.region)}">${esc(p.region_name)} 주차장 모두 보기 →</a></p></section>`:''}
${p.lat!=null&&p.lon!=null?aroundHtml(p.lat,p.lon,'🚶 주차하고 걸어서 갈 곳','FD6,CE7,CS2,PM9'):''}
<section><h2>주차장 정보</h2><dl class="pk-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${connectHtml(p)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: 전국주차장정보표준데이터(공공데이터포털, ${esc(p.org??'지자체')}). 요금·운영 시간이 현장과 다르면 관리기관에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}`;
}

async function detail(p:Lot,url:URL,env:Env,ctx:ExecutionContext){
  // '오늘' 운영 여부가 시각에 따라 바뀌므로 10분 단위로 새로 만듦.
  const key=new Request(`${url.origin}/parking/${p.id}?b=${Math.floor(Date.now()/600e3)}&v=${encodeURIComponent(data().status.updated_at)}&t=1`);
  const hit=await caches.default.match(key);if(hit)return hit;
  // 근처 주차장: 1km(없으면 3km) 안에서 1시간 요금이 싼 순(무료 먼저), 같으면 가까운 순.
  let around=p.lat!=null?near(p.lat,p.lon!,1,40,p.id).items:[];
  if(around.length<3&&p.lat!=null)around=near(p.lat,p.lon!,3,40,p.id).items;
  const fee=(x:Lot)=>feeFor(x,60)??Infinity;
  const nearby=[...around].sort((a,b)=>fee(a)-fee(b)||a.km-b.km).slice(0,6);
  const h1=feeFor(p,60);
  const title=`${p.name} 주차 요금·운영 시간 | 내근처 주차장`;
  const desc=`${p.region_name} ${p.name}(${[p.se,p.type].filter(Boolean).join(' ')}${p.spaces?` ${n(p.spaces)}면`:''}): ${feeLine(p)}${h1!=null&&h1>0?` · 1시간 약 ${n(h1)}원`:''} · ${hoursLine(p)}. ${p.addr??p.jibun??''}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+lotPath(p.id);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png"/><meta property="og:site_name" content="내근처 주차장"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="parking-detail">PARKING_DETAIL<\/div>/,detailHtml(p,nearby))
    .replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/fav'){const ids=[...new Set((p.get('ids')??'').split(','))].filter(x=>/^[0-9A-Za-z-]{2,40}$/.test(x)).slice(0,20);const now=kstNow();
        return json({items:ids.map(get).filter((x):x is Lot=>!!x).map(x=>{const o=openNow(x,now),w=feeFor(x,60);return {id:x.id,state:o.open?'open':'closed',label:x.charge==='무료'?'무료 주차장':w!=null?`1시간 약 ${won(w)}`:o.label,line:o.label};})},200,60);}
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const r=near(lat,lon,Math.max(.2,Math.min(20,num(p.get('km'))??1)),Math.max(1,Math.min(100,num(p.get('limit'))??30)),undefined,p.get('free')==='1');
        return json({total:r.total,items:r.items.map(x=>({...slim(x),km:x.km}))},200,300);}
      if(url.pathname==='/api/search'){const q=flat(p.get('q')??'').slice(0,30);if(!q)return json({total:0,items:[]});
        const words=(p.get('q')??'').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4).map(flat);
        const hit=data().items.filter(x=>{const name=flat(x.name),where=flat(x.region_name+(x.addr??'')+(x.jibun??''));return words.every(w=>name.includes(w)||where.includes(w));});
        const score=(x:Lot)=>{const name=flat(x.name);return name.startsWith(q)?0:name.includes(q)?1:2+words.filter(w=>!name.includes(w)).length;};
        hit.sort((a,b)=>score(a)-score(b)||a.name.localeCompare(b.name));
        return json({total:hit.length,items:hit.slice(0,40).map(slim)},200,600);}
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:data().status,now:kstNow()},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      const m=url.pathname.match(/^\/parking\/([0-9A-Za-z-]{3,30})\/?$/);
      if(m&&m[1]!=='shell'){const x=get(m[1]);if(x)return await detail(x,url,env,ctx);}
      if(m||url.pathname==='/parking/shell.html'){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
