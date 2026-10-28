// Cloudflare Worker for hospital.guidejung.com (내근처 병원). Static pages: ./out (Next.js export).
// D1 guidejung-hospital (scripts/build-hospital-d1.mjs): /api/near, /api/search, 병원 상세 /hospital/{hpid} (server-rendered
// into /hospital/shell), /sitemap.xml + /sitemap-hospitals-{n}.xml. /api/er adds 응급실 실시간 가용병상 from 국립중앙의료원
// (Secret DATA_GO_KR_KEY), cached per 시도 for 5 minutes in KV guidejung-cache (keys hospital:*).
import weatherRegions from '../../weather/data/regions.json';
import {CONDITIONS,DAY_LABEL,deptLabel,esc,eun,hm,hospitalPath,km,kstNow,n,SITE,statusOf,weekLine,type Card,type Hospital} from '../lib/fmt';
import {actionsHtml} from '../../../packages/ui/src/actions';

interface Env{ASSETS:Fetcher;DB:D1Database;CACHE:KVNamespace;DATA_GO_KR_KEY?:string}
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const version=async(env:Env)=>(await env.DB.prepare("SELECT value FROM meta WHERE key='version'").first<{value:string}>().catch(()=>null))?.value??'0';
const COND_COL:Record<string,string>={night:'night',sunday:'sun',holiday:'hol'};
const deptOk=(d:string|null)=>d&&/^[a-z]+$/.test(d)?d:null;

/** 좌표 주변: 상자로 거르고 거리순. cond=open이면 지금 시각으로 진료 중인 곳만. */
async function near(env:Env,lat:number,lon:number,radius:number,dept:string|null,cond:string|null,limit:number,skip?:string,er=false){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180));
  const where=['lat BETWEEN ? AND ?','lon BETWEEN ? AND ?'],args:unknown[]=[lat-dLat,lat+dLat,lon-dLon,lon+dLon];
  if(dept){where.push('depts LIKE ?');args.push(`% ${dept} %`);}
  if(cond&&COND_COL[cond])where.push(`${COND_COL[cond]} = 1`);
  if(er)where.push('er = 1');
  if(skip){where.push('id != ?');args.push(skip);}
  const {results}=await env.DB.prepare(`SELECT lat,lon,card FROM hospitals WHERE ${where.join(' AND ')}`).bind(...args).all<{lat:number;lon:number;card:string}>();
  const now=kstNow();
  const out=results.map(r=>({c:JSON.parse(r.card) as Card,d:distKm(lat,lon,r.lat,r.lon)})).filter(x=>x.d<=radius&&(cond!=='open'||statusOf(x.c,now).state!=='closed'))
    .sort((a,b)=>a.d-b.d);
  return {total:out.length,items:out.slice(0,limit).map(x=>({...x.c,km:Math.round(x.d*100)/100}))};
}
async function search(url:URL,env:Env){
  const p=url.searchParams,where:string[]=[],args:unknown[]=[];
  const dept=deptOk(p.get('dept')),region=p.get('region'),cond=p.get('cond'),q=(p.get('q')??'').trim().toLowerCase().slice(0,40);
  if(dept){where.push('depts LIKE ?');args.push(`% ${dept} %`);}
  if(region){where.push('region_id = ?');args.push(region);}
  if(cond&&COND_COL[cond])where.push(`${COND_COL[cond]} = 1`);
  for(const w of q.split(/\s+/).filter(Boolean).slice(0,4)){where.push('text LIKE ?');args.push(`%${w}%`);}
  if(!where.length)return json({total:0,items:[]});
  const limit=Math.max(1,Math.min(300,num(p.get('limit'))??40));
  const w=`WHERE ${where.join(' AND ')}`;
  const [count,rows]=await Promise.all([env.DB.prepare(`SELECT COUNT(*) AS n FROM hospitals ${w}`).bind(...args).first<{n:number}>(),
    env.DB.prepare(`SELECT card FROM hospitals ${w} ORDER BY rank DESC LIMIT ${limit}`).bind(...args).all<{card:string}>()]);
  return json({total:count?.n??0,items:rows.results.map(r=>JSON.parse(r.card))},200,300);
}

// ---- 응급실 실시간 가용병상(시도 단위, 5분) ---------------------------------------------------------------------------
type Bed={beds:number|null;updated:string|null};
async function bedsOf(env:Env,ctx:ExecutionContext,sido:string):Promise<Record<string,Bed>>{
  const key=`hospital:er:${sido}`;
  const kv=await env.CACHE.get<{t:number;m:Record<string,Bed>}>(key,'json').catch(()=>null);
  if(kv&&Date.now()-kv.t<5*60e3)return kv.m;
  if(!env.DATA_GO_KR_KEY)return kv?.m??{};
  try{
    const p=new URLSearchParams({serviceKey:env.DATA_GO_KR_KEY,STAGE1:sido,pageNo:'1',numOfRows:'300',_type:'json'});
    const r=await fetch(`https://apis.data.go.kr/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire?${p}`,{signal:AbortSignal.timeout(8000)});
    const d=await r.json() as any;let items=d?.response?.body?.items?.item??[];if(!Array.isArray(items))items=[items];
    const m:Record<string,Bed>={};
    for(const it of items){const t=String(it.hvidate??'');m[it.hpid]={beds:Number.isFinite(Number(it.hvec))?Number(it.hvec):null,updated:/^\d{12}/.test(t)?`${+t.slice(4,6)}/${+t.slice(6,8)} ${t.slice(8,10)}:${t.slice(10,12)}`:null};}
    ctx.waitUntil(env.CACHE.put(key,JSON.stringify({t:Date.now(),m}),{expirationTtl:3600}).catch(()=>{}));
    return m;
  }catch(e){console.error(e);return kv?.m??{};}
}
async function er(url:URL,env:Env,ctx:ExecutionContext){
  const lat=num(url.searchParams.get('lat')),lon=num(url.searchParams.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
  const limit=Math.max(1,Math.min(20,num(url.searchParams.get('limit'))??6));
  let list=(await near(env,lat,lon,30,null,null,limit,undefined,true)).items;
  if(list.length<3)list=(await near(env,lat,lon,80,null,null,limit,undefined,true)).items;
  const ids=list.map(c=>c.id);
  const rows=ids.length?(await env.DB.prepare(`SELECT id,sido,body FROM hospitals WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all<{id:string;sido:string;body:string}>()).results:[];
  const sidos=[...new Set(rows.map(r=>r.sido).filter(Boolean))];
  const beds=Object.assign({},...await Promise.all(sidos.map(s=>bedsOf(env,ctx,s))));
  const tel=new Map(rows.map(r=>[r.id,(JSON.parse(r.body) as Hospital).er_tel]));
  return json({items:list.map(c=>({...c,er_tel:tel.get(c.id)??null,...(beds[c.id]??{beds:null,updated:null})}))},200,60);
}

// ---- 상세 ---------------------------------------------------------------------------------------------------------
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/hospital/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});
type WR={code:string;name:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
function connectHtml(h:Hospital){
  if(h.lat==null||h.lon==null)return '';
  const r=WREG.reduce((x,y)=>distKm(h.lat!,h.lon!,y.lat,y.lon)<distKm(h.lat!,h.lon!,x.lat,x.lon)?y:x);
  const items:[string,string,string,string][]=[
    ['💊','근처 지금 문 연 약국','진료 뒤 처방전 들고 갈 약국',`https://pharmacy.guidejung.com/region/${h.region}`],
    ['🌤️',`${h.region_name} 날씨`,'비·미세먼지·기온 미리 확인',`https://weather.guidejung.com/region/${r.code}`],
    ['🏫','우리 학교 오늘 급식','학교 이름으로 급식·학사일정 찾기','https://school.guidejung.com/search'],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,u])=>`<a href="${esc(u)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}
// 이 병원만의 내용(구글은 틀만 같고 데이터만 바뀐 페이지를 색인하지 않음): 평일 마감·일주일 진료 시간을 같은 시군구·같은 과목과
// 비교, 반경 1km 같은 과목, 진료 뒤 갈 곳(가까운 약국·응급실·공영주차장). 계산은 collect-hospital.py enrich·region_stats.
type Near={id:string;name:string;m:number};
type HospitalX=Hospital&{dept?:string|null;wk_close?:number|null;week_h?:number;around?:{n:number;same:number;sun:number;night:number}|null;
  pharm?:(Near&{after:boolean})[];er_near?:Near|null;park?:(Near&{free:boolean})|null};
type DeptStats={n:number;c25:number|null;c50:number|null;c75:number|null;week:number|null;sat:number;sun:number;hol:number;night:number};
const hhmm=(v:number)=>hm(String(v).padStart(4,'0'));
const dist=(m:number)=>m<1000?`${n(m)}m`:`${(m/1000).toFixed(1)}km`;
const parkName=(s:string)=>/주차장$/.test(s)?s:/(공영|주차)$/.test(s)?`${s}${s.endsWith('주차')?'장':'주차장'}`:`${s} 공영주차장`;
function insight(h:HospitalX,stats:Record<string,DeptStats>){
  const k=h.dept??h.depts.find(d=>d!=='internal')??h.depts[0],dl=k?deptLabel(k):'병원',st=k?stats[k]:undefined,region=h.region_name;
  const close=h.wk_close??null,ar=h.around,ph=h.pharm??[],er=h.er_near,pk=h.park,allDay=(h.week_h??0)>=160;
  const cmp=st&&st.n>=8;
  const band=close!=null&&cmp&&st.c25!=null&&st.c75!=null?close>st.c75?'늦게까지 하는 편(상위 25%)':close<st.c25?'일찍 닫는 편(하위 25%)':'보통 시간에 닫는 곳':null;
  const lines=[
    allDay?`${eun(h.name)} 24시간 진료해요.`:close!=null?`${eun(h.name)} 평일 보통 ${hhmm(close)}까지 진료해${band?`, ${region} ${dl} ${n(st!.n)}곳 가운데 ${band}이에요`:'요'}.`:null,
    `${h.sat&&h.sun?'토요일·일요일 모두 진료해요':!h.sat&&!h.sun?'토요일·일요일은 휴진해요':h.sat?'토요일은 진료하고 일요일은 휴진해요':'토요일은 휴진하고 일요일은 진료해요'}.${cmp?` ${region}에서 일요일에 진료하는 ${eun(dl)} ${n(st!.sun)}곳${h.sun?'이고, 이 병원이 그중 하나예요':'이에요'}.`:''}`,
    h.week_h?`일주일 진료 시간은 약 ${h.week_h}시간이에요${cmp&&st!.week?`(${region} ${dl} 중앙값 ${st!.week}시간)`:''}.`:null,
    ar?ar.same?`반경 1km 안에 같은 ${dl} ${n(ar.same)}곳이 있고, 그중 일요일 진료 ${n(ar.sun)}곳·평일 20시 넘어서까지 진료 ${n(ar.night)}곳이에요.`:`반경 1km 안에 다른 ${eun(dl)} 없어요.`:null,
    ph[0]?`가장 가까운 약국은 ${ph[0].name}(${dist(ph[0].m)})이에요${ph[0].after?'. 평일 진료가 끝난 뒤에도 열려 있어요':''}.`:null,
    er?`가장 가까운 응급실은 ${er.name}(${dist(er.m)})이에요.`:null,
  ].filter(Boolean) as string[];
  const yn=(v:boolean)=>v?'<b>진료</b>':'<span class="muted">휴진</span>';
  const rows:[string,string,string][]=cmp?[
    ['평일 마감(보통)',allDay?'<b>24시간</b>':close!=null?`<b>${esc(hhmm(close))}</b>`:'–',st!.c50!=null?`중앙값 ${esc(hhmm(st!.c50))}${st!.c25!=null&&st!.c75!=null?` <small class="muted">(가운데 절반 ${esc(hhmm(st!.c25))}~${esc(hhmm(st!.c75))})</small>`:''}`:'–'],
    ['일주일 진료 시간',h.week_h?`<b>${h.week_h}시간</b>`:'–',st!.week?`중앙값 ${st!.week}시간`:'–'],
    ['토요일',yn(h.sat),`${n(st!.sat)}곳 진료`],['일요일',yn(h.sun),`${n(st!.sun)}곳 진료`],['공휴일',yn(h.hol),`${n(st!.hol)}곳 진료`],
    ['평일 20시 넘어서',yn(h.night),`${n(st!.night)}곳 진료`],
  ]:[];
  const table=rows.length?`<section><h2>진료 시간, 이 동네와 비교하면</h2><table class="hp-hours" style="max-width:none"><thead><tr><th></th><th>이 병원</th><th>${esc(region)} ${esc(dl)} ${n(st!.n)}곳</th></tr></thead><tbody>${rows.map(([a,b,c])=>`<tr><th>${esc(a)}</th><td>${b}</td><td>${c}</td></tr>`).join('')}</tbody></table>
<p class="muted small">같은 시군구에서 ${esc(dl)}를 진료과목으로 신고한 병·의원 기준(국립중앙의료원 신고 시간). 평일 마감은 월~금 가운데 보통 시각입니다.</p></section>`:'';
  const go=[...ph.map(p=>`<li>💊 <a href="https://pharmacy.guidejung.com/pharmacy/${esc(p.id)}">${esc(p.name)}</a> <span class="muted">· ${dist(p.m)}${p.after?' · 진료 끝난 뒤에도 영업':''}</span></li>`),
    er?`<li>🚑 <a href="${hospitalPath(er.id)}">${esc(er.name)} 응급실</a> <span class="muted">· ${dist(er.m)} · 실시간 남은 병상 보기</span></li>`:'',
    pk?`<li>🅿️ <a href="https://parking.guidejung.com/parking/${esc(pk.id)}">${esc(parkName(pk.name))}</a> <span class="muted">· ${dist(pk.m)}${pk.free?' · 무료':''}</span></li>`:''].filter(Boolean);
  const faq:[string,string][]=[
    [`${h.name} 토요일에도 진료하나요?`,h.hours['6']?`네, 토요일 ${hm(h.hours['6'][0])}~${hm(h.hours['6'][1])}에 진료합니다.`:'등록된 토요일 진료 시간이 없습니다(휴진으로 봅니다).'],
    ...(ph[0]?[[`${h.name} 근처 약국은 어디인가요?`,`${ph.map(p=>`${p.name} ${dist(p.m)}`).join(', ')} 거리에 있습니다(직선거리)${ph[0].after?`. ${ph[0].name}은 평일 진료가 끝난 뒤에도 영업합니다`:''}.`] as [string,string]]:[]),
    ...(er?[[`${h.name}에서 가장 가까운 응급실은?`,`${er.name} 응급실이 ${dist(er.m)} 거리에 있습니다(직선거리). 위급하면 119에 전화하세요.`] as [string,string]]:[]),
    ...(ar?[[`${h.name} 주변에 같은 과목 병원은 몇 곳인가요?`,`반경 1km 안에 ${dl} ${n(ar.same)}곳이 있습니다(전체 병·의원 ${n(ar.n)}곳).`] as [string,string]]:[]),
  ];
  const desc=[allDay?'24시간 진료':close!=null?`평일 ${hhmm(close)}까지${band&&band!=='보통 시간에 닫는 곳'?`(${region}에서 ${band.replace(/\(.*\)/,'')})`:''}`:'',`토요일 ${h.sat?'진료':'휴진'}·일요일 ${h.sun?'진료':'휴진'}`,ph[0]?`가까운 약국 ${ph[0].name} ${dist(ph[0].m)}`:''].filter(Boolean).join(' · ');
  return {top:lines.length?`<section><h2>한눈에 보기</h2><p>${lines.map(esc).join(' ')}</p></section>`:'',
    bottom:table+(go.length?`<section><h2>진료 뒤 가까운 곳</h2><ul class="hp-go" style="padding-left:4px;list-style:none;line-height:2">${go.join('')}</ul></section>`:''),faq,desc};
}

const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const LD_DAY:Record<string,string>={'1':'Monday','2':'Tuesday','3':'Wednesday','4':'Thursday','5':'Friday','6':'Saturday','7':'Sunday'};
const ldType=(div:string|null)=>/치과/.test(div??'')?'Dentist':/병원/.test(div??'')&&!/한방/.test(div??'')?'Hospital':'MedicalClinic';
const cardHtml=(c:Card)=>{const s=statusOf(c);return `<a class="hp-card ${s.state}" href="${hospitalPath(c.id)}"><span class="hp-dot" aria-hidden="true"></span><span class="hp-card-body"><b>${esc(c.name)}</b><small>${c.km!=null?`${esc(km(c.km))} · `:''}${esc(s.label)}</small><small class="muted">${esc([c.div,...c.depts.slice(0,3).map(deptLabel)].filter(Boolean).join(' · '))}</small></span></a>`;};

function detailHtml(h:Hospital,nearby:Card[],bed:Bed|null,ins:ReturnType<typeof insight>){
  const now=kstNow(),s=statusOf(h,now),todayKey=now.holiday?'8':now.day;
  const depts=h.depts.map(deptLabel);
  const faq:[string,string][]=([
    [`${h.name} 지금 진료하나요?`,`${s.state==='closed'?'지금은 진료 시간이 아닙니다':'지금 진료 중입니다'}(${s.label}). 요일별 시간: ${weekLine(h)}${h.hours['8']?` · 공휴일 ${hm(h.hours['8'][0])}~${hm(h.hours['8'][1])}`:''}.`],
    [`${h.name} 일요일에도 진료하나요?`,h.hours['7']?`네, 일요일 ${hm(h.hours['7'][0])}~${hm(h.hours['7'][1])}에 진료합니다.`:'등록된 일요일 진료 시간이 없습니다(휴진으로 봅니다).'],
    [`${h.name} 진료과목은?`,depts.length?`${depts.join(', ')}를 진료과목으로 신고했습니다.`:''],
    [`${eun(h.name)} 어디에 있나요?`,h.address?`${h.address}에 있는 ${h.div??'의료기관'}입니다${h.tel?`(전화 ${h.tel})`:''}.`:''],
    ...ins.faq,
  ] as [string,string][]).filter(([,x])=>x);
  const spec=Object.entries(h.hours).filter(([d])=>LD_DAY[d]).map(([d,[o,c]])=>({'@type':'OpeningHoursSpecification',dayOfWeek:`https://schema.org/${LD_DAY[d]}`,opens:hm(o).replace('새벽 ',''),closes:hm(c).replace('새벽 ','')}));
  const ld={'@context':'https://schema.org','@type':ldType(h.div),name:h.name,url:SITE+hospitalPath(h.id),image:SITE+'/og.png?v=2',
    ...(h.address?{address:{'@type':'PostalAddress',streetAddress:h.address,addressLocality:h.region_name.split(' ').slice(1).join(' ')||h.region_name,addressRegion:h.region_name.split(' ')[0],postalCode:h.zip??undefined,addressCountry:'KR'}}:{}),
    ...(h.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:h.lat,longitude:h.lon}}:{}),...(h.tel?{telephone:h.tel}:{}),...(spec.length?{openingHoursSpecification:spec}:{}),
    ...(depts.length&&ldType(h.div)!=='Dentist'?{medicalSpecialty:depts}:{}),...(h.info?{description:h.info}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 병원',SITE+'/'],['지역별 병원',SITE+'/region'],[h.region_name,`${SITE}/region/${h.region}`],[h.name,SITE+hospitalPath(h.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const map=h.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(h.name)},${h.lat},${h.lon}`:h.address?`https://map.kakao.com/?q=${encodeURIComponent(h.address)}`:null;
  const days=['1','2','3','4','5','6','7','8'];
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별 병원</a> › <a href="/region/${esc(h.region)}">${esc(h.region_name)}</a> › ${esc(h.name)}</nav>
<div class="hp-head"><h1>${esc(h.name)}</h1><p>${esc([h.div,h.region_name,h.address].filter(Boolean).join(' · '))}</p>
${depts.length?`<div class="hp-tags">${depts.map(d=>`<span>${esc(d)}</span>`).join('')}</div>`:''}</div>${actionsHtml({id:h.id,name:h.name,sub:[h.div,h.region_name].filter(Boolean).join(' · '),url:hospitalPath(h.id)})}
<p class="hp-answer ${s.state}"><span class="hp-dot" aria-hidden="true"></span><b>${esc(s.label)}</b>${s.today?` <span class="muted">· 오늘 ${esc(s.today)}</span>`:''}</p>
${h.er?`<div class="hp-er-box">🚑 <b>응급실 운영</b>${bed?.beds!=null?` · 지금 응급실 남은 병상 <strong>${bed.beds}</strong>${bed.updated?` <small class="muted">(${esc(bed.updated)} 기준)</small>`:''}`:''}${h.er_tel?` · <a href="tel:${esc(h.er_tel.replace(/[^0-9]/g,''))}">응급실 ${esc(h.er_tel)}</a>`:''}</div>`:''}
<div class="hp-actions">${h.tel?`<a href="tel:${esc(h.tel.replace(/[^0-9]/g,''))}">📞 전화하기</a>`:''}${map?`<a class="sub" href="${esc(map)}" rel="noopener" target="_blank">🧭 길찾기</a>`:''}</div>
<section><h2>요일별 진료 시간</h2><table class="hp-hours"><tbody>${days.map(d=>{const x=h.hours[d];return `<tr${d===todayKey?' class="today"':''}><th>${DAY_LABEL[d]}${d===todayKey?' (오늘)':''}</th><td>${x?`${esc(hm(x[0]))} ~ ${esc(hm(x[1]))}`:'<span class="muted">휴진</span>'}</td></tr>`;}).join('')}</tbody></table>
<p class="muted small">병원이 국립중앙의료원에 신고한 시간입니다. 점심시간·접수 마감·임시 휴진은 다를 수 있으니 가기 전에 전화로 확인하세요.</p></section>
${ins.top}
${h.info||h.note?`<section><h2>병원 안내</h2>${h.info?`<p>${esc(h.info)}</p>`:''}${h.note?`<p class="muted">${esc(h.note)}</p>`:''}</section>`:''}
${ins.bottom}
${nearby.length?`<section><h2>근처 ${esc((h as HospitalX).dept?deptLabel((h as HospitalX).dept!):depts[0]??'병원')}<span class="muted">${nearby.some(c=>statusOf(c).state!=='closed')?'지금 진료 중 · 가까운 순':'가까운 순'}</span></h2><div class="hp-cards">${nearby.map(cardHtml).join('')}</div><p><a class="hp-more-link" href="/region/${esc(h.region)}">${esc(h.region_name)} 병원 모두 보기 →</a></p></section>`:''}
<section><h2>병원 정보</h2><dl class="hp-facts">${([['종류',h.div],['주소',h.address],['전화',h.tel],['응급실 전화',h.er?h.er_tel:null],['우편번호',h.zip]] as [string,string|null][]).filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${connectHtml(h)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: 국립중앙의료원 전국 병·의원 찾기 서비스(공공데이터포털). 의료 상담·진단을 하지 않습니다. 위급하면 119에 전화하세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}`;
}

async function detail(id:string,url:URL,env:Env,ctx:ExecutionContext){
  const v=await version(env);
  // 진료 상태가 시각에 따라 바뀌므로 5분 단위로 새로 만듦.
  const key=new Request(`${url.origin}/hospital/${id}?b=${Math.floor(Date.now()/300e3)}&v=${encodeURIComponent(v)}&t=2`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const [row,rs]=await Promise.all([env.DB.prepare('SELECT body FROM hospitals WHERE id = ?').bind(id).first<{body:string}>(),
    env.DB.prepare('SELECT r.stats FROM regions r JOIN hospitals h ON h.region_id = r.id WHERE h.id = ?').bind(id).first<{stats:string}>().catch(()=>null)]);
  if(!row)return null;
  const h=JSON.parse(row.body) as HospitalX;
  const ins=insight(h,JSON.parse(rs?.stats??'{}'));
  const dept=h.dept??h.depts.find(d=>d!=='internal')??h.depts[0]??null;
  let nearby:Card[]=[];
  if(h.lat!=null){nearby=(await near(env,h.lat,h.lon!,5,dept,'open',6,h.id)).items;if(!nearby.length)nearby=(await near(env,h.lat,h.lon!,3,dept,null,6,h.id)).items;}
  const bed=h.er&&h.sido?(await bedsOf(env,ctx,h.sido))[h.id]??null:null;
  const title=`${h.name} 진료 시간·지금 진료 중 | 내근처 병원`;
  const desc=`${h.region_name} ${h.name}(${[h.div,...[...new Set([dept,...h.depts].filter(Boolean) as string[])].slice(0,3).map(deptLabel)].filter(Boolean).join('·')}). ${ins.desc}. ${weekLine(h)}${h.hours['8']?` · 공휴일 ${hm(h.hours['8'][0])}~${hm(h.hours['8'][1])}`:''}. ${h.tel??''}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+hospitalPath(h.id);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png?v=2"/><meta property="og:site_name" content="내근처 병원"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="hospital-detail">HOSPITAL_DETAIL<\/div>/,detailHtml(h,nearby,bed,ins))
    .replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=300'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

// 사이트맵 단계(hospitals.stage): 1 정적 지역·과목·조건 페이지에서 링크된 곳 → 2 야간·일요일·공휴일·응급실·병원급 → 3 전부.
// 새 사이트는 구글이 천천히 읽어서 좋은 페이지부터 내고, 서치 콘솔 색인 수가 늘면 숫자를 올림(10/28 1단계 약 12,000곳).
const SITEMAP_STAGE=1;
const SITEMAP_SIZE=40000;
const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
async function sitemap(url:URL,env:Env){
  if(url.pathname==='/sitemap.xml'){
    const c=await env.DB.prepare('SELECT COUNT(*) AS n FROM hospitals WHERE stage <= ?').bind(SITEMAP_STAGE).first<{n:number}>().catch(()=>null);
    const parts=['sitemap-pages.xml',...Array.from({length:Math.ceil((c?.n??0)/SITEMAP_SIZE)},(_,i)=>`sitemap-hospitals-${i+1}.xml`)];
    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${parts.map(p=>`<sitemap><loc>${SITE}/${p}</loc></sitemap>`).join('')}</sitemapindex>`);
  }
  const m=url.pathname.match(/^\/sitemap-hospitals-(\d+)\.xml$/);if(!m)return null;
  const {results}=await env.DB.prepare(`SELECT id FROM hospitals WHERE stage <= ? ORDER BY stage, id LIMIT ${SITEMAP_SIZE} OFFSET ?`).bind(SITEMAP_STAGE,(Number(m[1])-1)*SITEMAP_SIZE).all<{id:string}>();
  if(!results.length)return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${results.map(r=>`<url><loc>${SITE}${hospitalPath(r.id)}</loc></url>`).join('')}</urlset>`);
}

/** 같은 칸(약 2km — 브라우저는 칸 중심 좌표만 보냄)·같은 조건의 요청은 데이터센터 캐시에서 바로 돌려준다(응답의 max-age만큼). */
async function edge(req:Request,ctx:{waitUntil:(p:Promise<unknown>)=>void}|undefined,make:()=>Promise<Response>):Promise<Response>{
  const c=(globalThis as any).caches?.default as Cache|undefined;if(!c||req.method!=='GET')return make();
  const hit=await c.match(req).catch(()=>undefined);if(hit)return hit;
  const res=await make();const cc=res.headers.get('cache-control')??'';
  if(res.status===200&&/max-age=[1-9]/.test(cc)&&!/no-store|private/.test(cc)){const p=c.put(req,res.clone()).catch(()=>undefined);if(ctx)ctx.waitUntil(p);else await p;}
  return res;
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/fav'){const ids=[...new Set((p.get('ids')??'').split(','))].filter(x=>/^[0-9A-Za-z-]{2,40}$/.test(x)).slice(0,20);const now=kstNow();
        const rows=ids.length?(await env.DB.prepare(`SELECT id,card FROM hospitals WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all<{id:string;card:string}>()).results:[];
        return json({items:rows.map(r=>{const c=JSON.parse(r.card) as Card,s=statusOf(c,now);return {id:r.id,state:s.state,label:s.label,line:[c.div,...c.depts.slice(0,2).map(deptLabel)].filter(Boolean).join(' · ')};})},200,60);}
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const cond=p.get('cond');
        return await edge(req,ctx,async()=>json(await near(env,lat,lon,Math.max(.3,Math.min(20,num(p.get('km'))??2)),deptOk(p.get('dept')),cond&&(cond==='open'||COND_COL[cond])?cond:null,Math.max(1,Math.min(100,num(p.get('limit'))??30)))));}
      if(url.pathname==='/api/search')return await edge(req,ctx,()=>search(url,env));
      if(url.pathname==='/api/er')return await er(url,env,ctx);
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status'){const s=await env.DB.prepare("SELECT value FROM meta WHERE key='status'").first<{value:string}>().catch(()=>null);
        return json({status:s?JSON.parse(s.value):null,version:await version(env),now:kstNow(),key:!!env.DATA_GO_KR_KEY,conditions:Object.keys(CONDITIONS)},200,60);}
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      const m=url.pathname.match(/^\/hospital\/([0-9A-Z]{5,12})\/?$/);
      if(m){const res=await detail(m[1],url,env,ctx);if(res)return res;}
      if(url.pathname==='/hospital/shell'||url.pathname==='/hospital/shell.html'||m){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
      if(url.pathname==='/sitemap.xml'||url.pathname.startsWith('/sitemap-hospitals-')){const res=await sitemap(url,env);if(res)return res;}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
