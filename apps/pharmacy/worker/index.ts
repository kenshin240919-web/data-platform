// Cloudflare Worker for pharmacy.guidejung.com (내근처 약국). Static pages: ./out (Next.js export).
// The pharmacy list ships with the Worker (data/pharmacies.json, scripts/collect-pharmacy.py, about 25,000 — no database),
// imported as text (wrangler.jsonc rules) and parsed on first use. '지금 영업 중' is computed from the hours per request.
// Routes: /api/near, /api/search, /api/where, /api/status, 약국 상세 /pharmacy/{hpid} (server-rendered into /pharmacy/shell).
import raw from '../data/pharmacies.json';
import weatherRegions from '../../weather/data/regions.json';
import {DAY_LABEL,esc,eun,hm,km,kstNow,late,n,pharmacyPath,SITE,statusOf,sunday,holidayOpen,weekLine,type Card,type Pharmacy} from '../lib/fmt';
import {actionsHtml} from '../../../packages/ui/src/actions';

interface Env{ASSETS:Fetcher}
type Data={status:{updated_at:string;count:number};stats?:Record<string,RegionStats>;items:PharmacyX[]};
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
    out.push({id:p.id,name:p.name,address:p.address,tel:p.tel,lat:p.lat,lon:p.lon,hours:p.hours,zip:p.zip,region:p.region,region_name:p.region_name,km:Math.round(d*100)/100});
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
// 이 약국만의 내용(구글은 틀만 같고 데이터만 바뀐 페이지를 색인하지 않음): 평일 마감·일주일 영업 시간을 같은 시군구와 비교,
// 반경 1km 약국, 닫은 뒤 갈 곳(평일 마감 뒤에도 여는 약국·일요일에 여는 약국·응급실·공영주차장). 계산은 collect-pharmacy.py.
type Ref={id:string;m:number};
type PharmacyX=Pharmacy&{wk_close?:number|null;week_h?:number;stage?:number;around?:{n:number;sun:number};after?:Ref;sun_alt?:Ref;
  er_near?:Ref&{name:string};park?:Ref&{name:string;free:boolean}};
type RegionStats={n:number;c25?:number;c50?:number;c75?:number;week?:number;sat:number;sun:number;hol:number;night:number};
const hhmm=(v:number)=>hm(String(v).padStart(4,'0'));
const dist=(m:number)=>m<1000?`${n(m)}m`:`${(m/1000).toFixed(1)}km`;
const parkName=(s:string)=>/주차장$/.test(s)?s:/(공영|주차)$/.test(s)?`${s}${s.endsWith('주차')?'장':'주차장'}`:`${s} 공영주차장`;
function insight(p:PharmacyX){
  const st=data().stats?.[p.region],region=p.region_name,close=p.wk_close??null,ar=p.around,er=p.er_near,pk=p.park;
  const day=['1','2','3','4','5'].find(d=>p.hours[d]);
  const af=p.after&&get(p.after.id),afUntil=af&&day&&af.hours[day]?hm(af.hours[day][1]):null;
  const su=p.sun_alt&&get(p.sun_alt.id),allDay=(p.week_h??0)>=160,cmp=!!st&&st.n>=8;
  const band=close!=null&&cmp&&st!.c25!=null&&st!.c75!=null?close>st!.c75?'늦게까지 여는 편(상위 25%)':close<st!.c25?'일찍 닫는 편(하위 25%)':'보통 시간에 닫는 곳':null;
  const sat=!!p.hours['6'],sun=!!p.hours['7'],hol=!!p.hours['8'],night=late(p);
  const lines=[
    allDay?`${eun(p.name)} 24시간 열어요.`:close!=null?`${eun(p.name)} 평일 보통 ${hhmm(close)}에 닫아요${band?`. ${region} 약국 ${n(st!.n)}곳 가운데 ${band}이에요`:''}.`:null,
    `${sat&&sun?'토요일·일요일 모두 열어요':!sat&&!sun?'토요일·일요일은 쉬어요':sat?'토요일은 열고 일요일은 쉬어요':'토요일은 쉬고 일요일은 열어요'}${hol?'. 공휴일에도 열어요':''}.${cmp?` ${region}에서 일요일에 여는 약국은 ${n(st!.sun)}곳${sun?'이고, 이 약국이 그중 하나예요':'이에요'}.`:''}`,
    p.week_h?`일주일 영업 시간은 약 ${p.week_h}시간이에요${cmp&&st!.week?`(${region} 약국 중앙값 ${st!.week}시간)`:''}.`:null,
    ar?ar.n?`반경 1km 안에 다른 약국 ${n(ar.n)}곳이 있고, 그중 일요일에 여는 곳은 ${n(ar.sun)}곳이에요.`:'반경 1km 안에 다른 약국이 없어요.':null,
    af&&close!=null&&!allDay?`평일 ${hhmm(close)}에 닫은 뒤에는 ${af.name}(${dist(p.after!.m)})이 ${afUntil?`${afUntil}까지 `:''}열려 있어요.`:null,
  ].filter(Boolean) as string[];
  const yn=(v:boolean)=>v?'<b>영업</b>':'<span class="muted">휴무</span>';
  const rows:[string,string,string][]=cmp?[
    ['평일 마감(보통)',allDay?'<b>24시간</b>':close!=null?`<b>${esc(hhmm(close))}</b>`:'–',st!.c50!=null?`중앙값 ${esc(hhmm(st!.c50))}${st!.c25!=null&&st!.c75!=null?` <small class="muted">(가운데 절반 ${esc(hhmm(st!.c25))}~${esc(hhmm(st!.c75))})</small>`:''}`:'–'],
    ['일주일 영업 시간',p.week_h?`<b>${p.week_h}시간</b>`:'–',st!.week?`중앙값 ${st!.week}시간`:'–'],
    ['토요일',yn(sat),`${n(st!.sat)}곳 영업`],['일요일',yn(sun),`${n(st!.sun)}곳 영업`],['공휴일',yn(hol),`${n(st!.hol)}곳 영업`],
    ['평일 밤 10시 넘어서',yn(night),`${n(st!.night)}곳 영업`],
  ]:[];
  const table=rows.length?`<section><h2>운영 시간, 이 동네와 비교하면</h2><table class="ph-hours" style="max-width:none"><thead><tr><th></th><th>이 약국</th><th>${esc(region)} 약국 ${n(st!.n)}곳</th></tr></thead><tbody>${rows.map(([a,b,c])=>`<tr><th>${esc(a)}</th><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody></table>
<p class="muted small">같은 시군구 약국이 국립중앙의료원에 신고한 시간 기준입니다. 평일 마감은 월~금 가운데 보통 시각입니다.</p></section>`:'';
  const go=[
    af&&!allDay?`<li>🌙 <a href="${pharmacyPath(af.id)}">${esc(af.name)}</a> <span class="muted">· ${dist(p.after!.m)} · ${close!=null?`평일 ${esc(hhmm(close))} 넘어서도 영업`:'더 늦게까지 영업'}${afUntil?`(${esc(afUntil)}까지)`:''}${su&&su.id===af.id?` · 일요일 ${esc(hm(su.hours['7'][0]))}~${esc(hm(su.hours['7'][1]))} 영업`:''}</span></li>`:'',
    su&&su.id!==af?.id?`<li>📅 <a href="${pharmacyPath(su.id)}">${esc(su.name)}</a> <span class="muted">· ${dist(p.sun_alt!.m)} · 일요일 ${esc(hm(su.hours['7'][0]))}~${esc(hm(su.hours['7'][1]))} 영업</span></li>`:'',
    er?`<li>🚑 <a href="https://hospital.guidejung.com/hospital/${esc(er.id)}">${esc(er.name)} 응급실</a> <span class="muted">· ${dist(er.m)} · 실시간 남은 병상 보기</span></li>`:'',
    pk?`<li>🅿️ <a href="https://parking.guidejung.com/parking/${esc(pk.id)}">${esc(parkName(pk.name))}</a> <span class="muted">· ${dist(pk.m)}${pk.free?' · 무료':''}</span></li>`:''].filter(Boolean);
  const faq:[string,string][]=[
    ...(close!=null&&!allDay?[[`${p.name} 닫은 뒤 근처에 여는 약국이 있나요?`,af?`평일 기준 ${af.name}이 ${dist(p.after!.m)} 거리에 있고 ${afUntil?`${afUntil}까지 `:''}엽니다(직선거리, 신고 시간 기준).`:`반경 2km 안에는 평일 ${hhmm(close)} 넘어서까지 여는 약국이 등록돼 있지 않습니다.`] as [string,string]]:[]),
    ...(!sun&&su?[[`${p.name} 근처에 일요일에 여는 약국은?`,`${su.name}이 ${dist(p.sun_alt!.m)} 거리에 있고 일요일 ${hm(su.hours['7'][0])}~${hm(su.hours['7'][1])}에 엽니다.`] as [string,string]]:[]),
    ...(er?[[`${p.name}에서 가장 가까운 응급실은?`,`${er.name} 응급실이 ${dist(er.m)} 거리에 있습니다(직선거리). 위급하면 119에 전화하세요.`] as [string,string]]:[]),
  ];
  const desc=[allDay?'24시간 영업':close!=null?`평일 ${hhmm(close)}까지${band&&band!=='보통 시간에 닫는 곳'?`(${region}에서 ${band.replace(/\(.*\)/,'')})`:''}`:'',`토요일 ${sat?'영업':'휴무'}·일요일 ${sun?'영업':'휴무'}`,af&&!allDay?`닫은 뒤 ${af.name} ${dist(p.after!.m)}`:''].filter(Boolean).join(' · ');
  return {top:lines.length?`<section><h2>한눈에 보기</h2><p>${lines.map(esc).join(' ')}</p></section>`:'',
    bottom:table+(go.length?`<section><h2>🌙 이 약국이 닫은 뒤 갈 곳</h2><ul style="padding-left:4px;list-style:none;line-height:2">${go.join('')}</ul></section>`:''),faq,desc};
}

const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const LD_DAY:Record<string,string>={'1':'Monday','2':'Tuesday','3':'Wednesday','4':'Thursday','5':'Friday','6':'Saturday','7':'Sunday'};
const cardHtml=(c:Card)=>{const s=statusOf(c);return `<a class="ph-card ${s.state}" href="${pharmacyPath(c.id)}"><span class="ph-dot" aria-hidden="true"></span><span class="ph-card-body"><b>${esc(c.name)}</b><small>${c.km!=null?`${esc(km(c.km))} · `:''}${esc(s.label)}</small></span></a>`;};

function detailHtml(p:PharmacyX,nearby:Card[],ins:ReturnType<typeof insight>){
  const now=kstNow(),s=statusOf(p,now);
  const days=['1','2','3','4','5','6','7','8'];
  const todayKey=now.holiday?'8':now.day;
  const faq:[string,string][]=([
    [`${p.name} 지금 영업하나요?`,`${s.state==='closed'?'지금은 영업 시간이 아닙니다':'지금 영업 중입니다'}(${s.label}). 요일별 시간: ${weekLine(p)}${p.hours['8']?` · 공휴일 ${hm(p.hours['8'][0])}~${hm(p.hours['8'][1])}`:''}.`],
    [`${p.name} 일요일에도 여나요?`,p.hours['7']?`네, 일요일 ${hm(p.hours['7'][0])}~${hm(p.hours['7'][1])}에 엽니다.`:'등록된 일요일 운영 시간이 없습니다(휴무로 봅니다).'],
    [`${p.name} 공휴일에도 여나요?`,p.hours['8']?`네, 공휴일 ${hm(p.hours['8'][0])}~${hm(p.hours['8'][1])}에 엽니다.`:'등록된 공휴일 운영 시간이 없습니다(휴무로 봅니다).'],
    [`${eun(p.name)} 어디에 있나요?`,p.address?`${p.address}에 있습니다${p.tel?`(전화 ${p.tel})`:''}.`:''],
    ...ins.faq,
  ] as [string,string][]).filter(([,x])=>x);
  const spec=Object.entries(p.hours).filter(([d])=>LD_DAY[d]).map(([d,[o,c]])=>({'@type':'OpeningHoursSpecification',dayOfWeek:`https://schema.org/${LD_DAY[d]}`,opens:hm(o).replace('새벽 ',''),closes:hm(c).replace('새벽 ','')}));
  const ld={'@context':'https://schema.org','@type':'Pharmacy',name:p.name,url:SITE+pharmacyPath(p.id),image:SITE+'/og.png?v=2',
    ...(p.address?{address:{'@type':'PostalAddress',streetAddress:p.address,addressLocality:p.region_name.split(' ').slice(1).join(' ')||p.region_name,addressRegion:p.region_name.split(' ')[0],postalCode:p.zip??undefined,addressCountry:'KR'}}:{}),
    ...(p.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:p.lat,longitude:p.lon}}:{}),...(p.tel?{telephone:p.tel}:{}),...(spec.length?{openingHoursSpecification:spec}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 약국',SITE+'/'],['지역별 약국',SITE+'/region'],[p.region_name,`${SITE}/region/${p.region}`],[p.name,SITE+pharmacyPath(p.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const map=p.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:p.address?`https://map.kakao.com/?q=${encodeURIComponent(p.address)}`:null;
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별 약국</a> › <a href="/region/${esc(p.region)}">${esc(p.region_name)}</a> › ${esc(p.name)}</nav>
<div class="ph-head"><h1>${esc(p.name)}</h1><p>${esc([p.region_name,p.address].filter(Boolean).join(' · '))}</p></div>${actionsHtml({id:p.id,name:p.name,sub:p.region_name,url:pharmacyPath(p.id)})}
<p class="ph-answer ${s.state}"><span class="ph-dot" aria-hidden="true"></span><b>${esc(s.label)}</b>${s.today?` <span class="muted">· 오늘 ${esc(s.today)}</span>`:''}</p>
<div class="ph-actions">${p.tel?`<a href="tel:${esc(p.tel.replace(/[^0-9]/g,''))}">📞 전화하기</a>`:''}${map?`<a class="sub" href="${esc(map)}" rel="noopener" target="_blank">🧭 길찾기</a>`:''}</div>
${ins.top}<section><h2>요일별 운영 시간</h2><table class="ph-hours"><tbody>${days.map(d=>{const h=p.hours[d];return `<tr${d===todayKey?' class="today"':''}><th>${DAY_LABEL[d]}${d===todayKey?' (오늘)':''}</th><td>${h?`${esc(hm(h[0]))} ~ ${esc(hm(h[1]))}`:'<span class="muted">휴무</span>'}</td></tr>`;}).join('')}</tbody></table>
<p class="muted small">약국이 국립중앙의료원에 신고한 시간입니다. 명절·임시 휴무는 다를 수 있으니 가기 전에 전화로 확인하세요.</p></section>
${ins.bottom}${nearby.length?`<section><h2>근처 다른 약국 <span class="muted">${nearby.some(c=>statusOf(c).state!=='closed')?'지금 문 연 곳 · 가까운 순':'가까운 순'}</span></h2><div class="ph-cards">${nearby.map(cardHtml).join('')}</div><p><a class="ph-more-link" href="/region/${esc(p.region)}">${esc(p.region_name)} 약국 모두 보기 →</a></p></section>`:''}
<section><h2>약국 정보</h2><dl class="ph-facts">${([['주소',p.address],['전화',p.tel],['우편번호',p.zip],['지역',p.region_name]] as [string,string|null][]).filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${connectHtml(p)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: 국립중앙의료원 전국 약국 정보 조회 서비스(공공데이터포털). 잘못된 정보는 관할 보건소에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}`;
}

async function detail(p:PharmacyX,url:URL,env:Env,ctx:ExecutionContext){
  // 영업 상태가 시각에 따라 바뀌므로 5분 단위로 새로 만듦.
  const key=new Request(`${url.origin}/pharmacy/${p.id}?b=${Math.floor(Date.now()/300e3)}&v=${encodeURIComponent(data().status.updated_at)}&t=2`);
  const hit=await caches.default.match(key);if(hit)return hit;
  // 근처 약국은 지금 문 연 곳 먼저(밤·휴일에 바로 갈 곳), 없으면 가까운 순.
  const openNear=p.lat!=null?near(p.lat,p.lon!,5,'open',6,p.id).items:[];
  const nearby=openNear.length?openNear:p.lat!=null?near(p.lat,p.lon!,3,null,6,p.id).items:[];
  const title=`${p.name} 운영 시간·지금 영업 | 내근처 약국`;
  const ins=insight(p);
  const desc=`${p.region_name} ${p.name}: ${ins.desc}. ${weekLine(p)}${p.hours['8']?` · 공휴일 ${hm(p.hours['8'][0])}~${hm(p.hours['8'][1])}`:''}. ${p.address??''}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+pharmacyPath(p.id);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png?v=2"/><meta property="og:site_name" content="내근처 약국"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="pharmacy-detail">PHARMACY_DETAIL<\/div>/,detailHtml(p,nearby,ins))
    .replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/fav'){const ids=[...new Set((p.get('ids')??'').split(','))].filter(x=>/^[0-9A-Za-z-]{2,40}$/.test(x)).slice(0,20);const now=kstNow();
        return json({items:ids.map(get).filter((x):x is Pharmacy=>!!x).map(x=>{const s=statusOf(x,now);return {id:x.id,state:s.state,label:s.label,line:x.region_name};})},200,60);}
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const cond=p.get('cond');return json(near(lat,lon,Math.max(.3,Math.min(20,num(p.get('km'))??2)),cond&&TESTS[cond]?cond:null,Math.max(1,Math.min(300,num(p.get('limit'))??20))));}
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
