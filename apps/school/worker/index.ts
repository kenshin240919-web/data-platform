// Cloudflare Worker for school.guidejung.com (내 학교). Static pages: ./out (Next.js export).
// The school list ships with the Worker (data/schools.json, scripts/collect-school.py, about 12,600 schools — no database).
// 급식·학사일정·시간표 are fetched from NEIS per school on demand and kept in KV guidejung-cache (keys school:*), so a
// school costs one NEIS call per month of meals, per few months of calendar and per class-week of timetable, shared worldwide.
// Routes: /api/search, /api/today, /api/meal, /api/schedule, /api/classes, /api/timetable, /api/where, /api/status,
// 학교 상세 /school/{학교코드} (server-rendered into the static template /school/shell so header·footer·scripts match).
import raw from '../data/schools.json';
import weatherRegions from '../../weather/data/regions.json';
import {addDays,ALLERGENS,bigEvent,card,dayDiff,dday,esc,eun,eventDate,GRADES_OF,KIND_LABEL,kstDay,mdw,menuLine,monday,parseDishes,schoolPath,schoolYear,SITE,
  TIMETABLE_API,weekday,ymd,type Card,type Event,type Meal,type MealDay,type School,type Today} from '../lib/fmt';

interface Env{ASSETS:Fetcher;CACHE:KVNamespace;NEIS_API_KEY?:string}
type Data={status:{updated_at:string;count:number};items:School[]};
// wrangler.jsonc imports the file as text (rules): parse once, on the first request that needs it.
let parsed:Data|null=null,byCode:Map<string,School>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const D={get status(){return data().status;},get items(){return data().items;}};
const BY_CODE={get:(c:string)=>(byCode??=new Map(data().items.map(s=>[s.code,s]))).get(c)};
const json=(d:unknown,status=200,maxAge=300)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();

// ---- NEIS with a shared KV cache ------------------------------------------------------------------------------------
type Row=Record<string,string|number|null>;
const mem=new Map<string,{t:number;rows:Row[]}>();
const inflight=new Map<string,Promise<Row[]>>();
async function neis(env:Env,ctx:ExecutionContext,api:string,q:Record<string,string>,ttl:number):Promise<Row[]>{
  const key=`school:${api}:${Object.keys(q).sort().map(k=>`${k}=${q[k]}`).join('&')}`;
  const m=mem.get(key);if(m&&Date.now()-m.t<Math.min(ttl,600)*1000)return m.rows;
  const run=inflight.get(key)??(async()=>{
    const kv=await env.CACHE.get<Row[]>(key,'json').catch(()=>null);
    if(kv){mem.set(key,{t:Date.now(),rows:kv});return kv;}
    const p=new URLSearchParams({Type:'json',pIndex:'1',pSize:'1000',...q});if(env.NEIS_API_KEY)p.set('KEY',env.NEIS_API_KEY);
    const r=await fetch(`https://open.neis.go.kr/hub/${api}?${p}`,{signal:AbortSignal.timeout(8000)});
    if(!r.ok)throw new Error(`NEIS ${api} ${r.status}`);
    const d=await r.json() as Record<string,any>;
    let rows:Row[];
    if(d[api])rows=d[api][1]?.row??[];
    else if(d.RESULT?.CODE==='INFO-200'){rows=[];ttl=Math.min(ttl,3*3600);}  // 해당 자료 없음: 짧게 기억
    else throw new Error(`NEIS ${api} ${d.RESULT?.CODE??'?'}`);
    mem.set(key,{t:Date.now(),rows});
    ctx.waitUntil(env.CACHE.put(key,JSON.stringify(rows),{expirationTtl:Math.max(60,ttl)}).catch(()=>{}));
    return rows;
  })().finally(()=>inflight.delete(key));
  inflight.set(key,run);
  return run;
}
const base=(s:School)=>({ATPT_OFCDC_SC_CODE:s.office,SD_SCHUL_CODE:s.code});
const lastDay=(ym:string)=>new Date(Date.UTC(+ym.slice(0,4),+ym.slice(4,6),0)).getUTCDate();

/** One month of meals (one NEIS call, 6 hours). */
async function mealMonth(env:Env,ctx:ExecutionContext,s:School,ym:string):Promise<MealDay[]>{
  const rows=await neis(env,ctx,'mealServiceDietInfo',{...base(s),MLSV_FROM_YMD:ym+'01',MLSV_TO_YMD:ym+String(lastDay(ym))},6*3600);
  const days=new Map<string,Meal[]>();
  for(const r of rows){const date=String(r.MLSV_YMD);(days.get(date)??days.set(date,[]).get(date)!).push({type:String(r.MMEAL_SC_NM??'중식'),dishes:parseDishes(String(r.DDISH_NM??'')),cal:r.CAL_INFO?String(r.CAL_INFO).replace(/\s*Kcal/i,' kcal'):null,
    origin:r.ORPLC_INFO?String(r.ORPLC_INFO):null,nutrition:r.NTR_INFO?String(r.NTR_INFO):null});}
  const order=['조식','중식','석식'];
  return [...days].sort(([a],[b])=>a<b?-1:1).map(([date,meals])=>({date,meals:meals.sort((a,b)=>order.indexOf(a.type)-order.indexOf(b.type))}));
}
async function meals(env:Env,ctx:ExecutionContext,s:School,from:string,to:string){
  const months=[...new Set([from.slice(0,6),to.slice(0,6)])];
  const all=(await Promise.all(months.map(m=>mealMonth(env,ctx,s,m)))).flat();
  return all.filter(d=>d.date>=from&&d.date<=to);
}
/** 학사일정: this month and the next three (one call, 1 day). */
async function schedule(env:Env,ctx:ExecutionContext,s:School,today:string):Promise<Event[]>{
  const from=today.slice(0,6)+'01',endYm=addDays(from,31*3).slice(0,6),to=endYm+String(lastDay(endYm));
  const rows=await neis(env,ctx,'SchoolSchedule',{...base(s),AA_FROM_YMD:from,AA_TO_YMD:to},24*3600);
  const seen=new Set<string>(),out:Event[]=[];
  const flags=['ONE','TW','THREE','FR','FIV','SIX'];
  for(const r of rows){const date=String(r.AA_YMD),name=String(r.EVENT_NM??'').trim();if(!name||seen.has(date+name))continue;seen.add(date+name);
    out.push({date,name,off:/휴업|공휴/.test(String(r.SBTR_DD_SC_NM??'')),grades:flags.map((f,i)=>r[`${f}_GRADE_EVENT_YN`]==='Y'?i+1:0).filter(Boolean)});}
  out.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  // 같은 이름이 며칠 이어지면(기말고사 3일, 주말 사이 포함) 한 줄로: date~end.
  const merged:Event[]=[];
  for(const e of out){const prev=[...merged].reverse().find(x=>x.name===e.name);
    if(prev&&dayDiff(prev.end??prev.date,e.date)<=3&&merged.indexOf(prev)>=merged.length-3)prev.end=e.date;else merged.push({...e});}
  return merged.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
}
async function classes(env:Env,ctx:ExecutionContext,s:School,today:string){
  const rows=await neis(env,ctx,'classInfo',{...base(s),AY:schoolYear(today)},7*24*3600);
  const g:Record<string,string[]>={};
  for(const r of rows){const k=String(r.GRADE??''),c=String(r.CLASS_NM??'').trim();if(!k||!c)continue;(g[k]??=[]);if(!g[k].includes(c))g[k].push(c);}
  for(const k in g)g[k].sort((a,b)=>(Number(a)||0)-(Number(b)||0)||a.localeCompare(b));
  return g;
}
async function timetable(env:Env,ctx:ExecutionContext,s:School,grade:string,cls:string,from:string,to:string){
  const api=TIMETABLE_API[s.k];if(!api)return [];
  const rows=await neis(env,ctx,api,{...base(s),AY:schoolYear(from),GRADE:grade,CLASS_NM:cls,TI_FROM_YMD:from,TI_TO_YMD:to},12*3600);
  const days=new Map<string,string[]>();
  for(const r of rows){const d=String(r.ALL_TI_YMD),p=Number(r.PERIO)||0,v=String(r.ITRT_CNTNT??'').replace(/^-+/,'').trim();if(!p)continue;const a=days.get(d)??days.set(d,[]).get(d)!;a[p-1]=a[p-1]?`${a[p-1]}/${v}`:v;}
  return [...days].sort(([a],[b])=>a<b?-1:1).map(([date,periods])=>({date,periods:Array.from(periods,x=>x??'')}));
}
/** Week shown on a school page: this Monday–Friday, next week from Saturday on. */
const shownWeek=(today:string)=>{const wd=weekday(today);const mon=wd==='토'||wd==='일'?addDays(monday(today),7):monday(today);return {from:mon,to:addDays(mon,4)};};

// 메인 3초 답에는 원산지·영양 정보가 필요 없음(응답 크기).
const slim=(d?:MealDay)=>d?{date:d.date,meals:d.meals.map(m=>({type:m.type,dishes:m.dishes,cal:m.cal}))}:null;
async function todayOf(env:Env,ctx:ExecutionContext,s:School,grade:string|null,cls:string|null):Promise<Today>{
  const today=kstDay(),errors:string[]=[];
  const safe=<T,>(p:Promise<T>,fb:T,what:string)=>p.catch(e=>{console.error(e);errors.push(what);return fb;});
  const [ms,ev,tt]=await Promise.all([
    safe(meals(env,ctx,s,today,addDays(today,14)),[] as MealDay[],'meal'),
    safe(schedule(env,ctx,s,today),[] as Event[],'schedule'),
    grade&&cls&&TIMETABLE_API[s.k]?safe(timetable(env,ctx,s,grade,cls,today,today),[] as {date:string;periods:string[]}[],'timetable'):Promise.resolve([]),
  ]);
  return {school:card(s),today,meal:slim(ms.find(d=>d.date===today)),next:slim(ms.find(d=>d.date>today)),
    events:ev.filter(e=>(e.end??e.date)>=today&&bigEvent(e)).slice(0,4),timetable:tt[0]??null,...(errors.length?{errors}:{})};
}

// ---- search ---------------------------------------------------------------------------------------------------------
function search(url:URL){
  const p=url.searchParams,q=flat(p.get('q')??'').slice(0,30),k=p.get('k'),lat=num(p.get('lat')),lon=num(p.get('lon'));
  const limit=Math.max(1,Math.min(50,num(p.get('limit'))??20));
  let list=D.items.filter(s=>!k||s.k===k);
  if(lat!==null&&lon!==null){
    const km=Math.max(.5,Math.min(30,num(p.get('km'))??3));
    const near=list.filter(s=>s.lat!=null).map(s=>({s,km:distKm(lat,lon,s.lat!,s.lon!)})).filter(x=>x.km<=km).sort((a,b)=>a.km-b.km);
    return json({total:near.length,items:near.slice(0,limit).map(x=>({...card(x.s),km:Math.round(x.km*100)/100}))});
  }
  if(!q)return json({total:0,items:[]});
  // '대치중' → 대치중학교, '서울 대치' → 지역+이름. 이름 앞부분이 맞는 학교 먼저.
  const words=(p.get('q')??'').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4);
  const hit=list.filter(s=>{const name=flat(s.name),where=flat(s.region_name+(s.address??''));return words.every(w=>name.includes(flat(w))||where.includes(flat(w)));});
  // 이름에 맞는 낱말이 많은 학교 먼저(주소에만 맞는 학교는 뒤로: '서울 상암' → 상암초·상암중이 상암로의 학교보다 먼저).
  const score=(s:School)=>{const name=flat(s.name);return name.startsWith(q)?0:name.includes(q)?1:2+words.filter(w=>!name.includes(flat(w))).length;};
  hit.sort((a,b)=>score(a)-score(b)||a.name.length-b.name.length||a.name.localeCompare(b.name));
  return json({total:hit.length,items:hit.slice(0,limit).map(card)},200,3600);
}

// ---- detail page ----------------------------------------------------------------------------------------------------
// The static template page (/school/shell) with Next's client scripts removed: the detail HTML is not React output,
// so hydrating it would replace the content. Ads, GA and Clarity scripts stay.
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/school/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});

type WR={code:string;name:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
function connectHtml(s:School){
  if(s.lat==null||s.lon==null)return '';
  const r=WREG.reduce((x,y)=>distKm(s.lat!,s.lon!,y.lat,y.lon)<distKm(s.lat!,s.lon!,x.lat,x.lon)?y:x),ll=`lat=${s.lat.toFixed(4)}&lon=${s.lon.toFixed(4)}`;
  const items:[string,string,string,string][]=[
    ['🎓',`${s.name} 근처 학원·학원비`,'2km 안 학원과 교육청 공개 수강료',`https://academy.guidejung.com/search?${ll}&km=2`],
    ['🌤️','등하교 날씨','비·미세먼지·옷차림 미리 확인',`https://weather.guidejung.com/region/${r.code}`],
    ['🧒','주말에 아이와 갈 만한 곳','10km 안 아이 동반 장소',`https://trip.guidejung.com/search?${ll}&radius_km=10&condition=kids`],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,h])=>`<a href="${esc(h)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}
const dishHtml=(m:Meal)=>`<ul class="sc-dishes">${m.dishes.map(d=>`<li data-al="${d.allergens.join(' ')}"><span>${esc(d.name)}</span>${d.allergens.length?`<small title="${esc(d.allergens.map(a=>ALLERGENS[a]).join(', '))}">${esc(d.allergens.map(a=>ALLERGENS[a]).join('·'))}</small>`:''}</li>`).join('')}</ul>`;
const mealHtml=(m:Meal)=>`<div class="sc-meal"><div class="sc-meal-head"><b>${esc(m.type)}</b>${m.cal?`<span>${esc(m.cal)}</span>`:''}</div>${dishHtml(m)}</div>`;

// 상세 페이지(하이드레이션 없음)의 브라우저 동작: 내 학교 저장(gj.school, 메인 3초 답), 알레르기 표시(gj.allergy), 학년·반 시간표.
const PAGE_JS=`<script>(function(){
var S=document.getElementById('sc-page');if(!S)return;var code=S.dataset.code,name=S.dataset.name,kind=S.dataset.kind,k=S.dataset.k;
function get(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}}function put(key,v){try{localStorage.setItem(key,JSON.stringify(v))}catch(e){}}
var b=document.getElementById('sc-save');function mine(){var m=get('gj.school');return m&&m.code===code?m:null}
function draw(){if(!b)return;var on=!!mine();b.textContent=on?'⭐ 내 학교로 저장됨':'☆ 내 학교로 저장';b.className=on?'sc-save on':'sc-save'}
if(b)b.addEventListener('click',function(){var m=get('gj.school');if(m&&m.code===code){localStorage.removeItem('gj.school')}else{put('gj.school',{code:code,name:name,kind:kind,k:k,grade:m&&m.code===code?m.grade:null,cls:null})}draw()});draw();
var al=get('gj.allergy')||[],box=document.getElementById('sc-allergy');
function mark(){document.querySelectorAll('.sc-dishes li').forEach(function(li){var a=(li.dataset.al||'').split(' ').filter(Boolean).map(Number);li.classList.toggle('warn',a.some(function(x){return al.indexOf(x)>=0}))});
if(box)box.querySelectorAll('button').forEach(function(x){x.className=al.indexOf(+x.dataset.n)>=0?'on':''})}
if(box)box.addEventListener('click',function(e){var t=e.target.closest('button');if(!t)return;var v=+t.dataset.n,i=al.indexOf(v);if(i>=0)al.splice(i,1);else al.push(v);put('gj.allergy',al);mark()});mark();
var tt=document.getElementById('sc-tt');if(!tt)return;var gs=document.getElementById('sc-grade'),cs=document.getElementById('sc-class'),out=document.getElementById('sc-tt-out');var cls={};
function load(){var g=gs.value,c=cs.value;if(!g||!c){out.innerHTML='';return}var m=mine();if(m){m.grade=g;m.cls=c;put('gj.school',m)}else put('gj.tt.'+code,{grade:g,cls:c});
out.innerHTML='<p class="muted">시간표 불러오는 중…</p>';fetch('/api/timetable?code='+code+'&grade='+g+'&class='+encodeURIComponent(c)).then(function(r){return r.json()}).then(function(d){
if(!d.days||!d.days.length){out.innerHTML='<p class="muted">이번 주 시간표가 아직 올라오지 않았어요(방학·시험 기간이거나 학교가 입력하지 않은 경우).</p>';return}
var max=Math.max.apply(null,d.days.map(function(x){return x.periods.length})),h='<div class="sc-tt-scroll"><table class="sc-tt"><thead><tr><th></th>';d.days.forEach(function(x){h+='<th'+(x.date===d.today?' class="today"':'')+'>'+x.label+'</th>'});h+='</tr></thead><tbody>';
for(var p=0;p<max;p++){h+='<tr><th>'+(p+1)+'교시</th>';d.days.forEach(function(x){var v=x.periods[p]||'';h+='<td'+(x.date===d.today?' class="today"':'')+'>'+v.replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})+'</td>'});h+='</tr>'}
out.innerHTML=h+'</tbody></table></div>'}).catch(function(){out.innerHTML='<p class="muted">시간표를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>'})}
function fill(){var g=gs.value;cs.innerHTML='<option value="">반</option>'+(cls[g]||[]).map(function(c){return '<option>'+c+'</option>'}).join('')}
gs.addEventListener('change',function(){fill();cs.value='';load()});cs.addEventListener('change',load);
fetch('/api/classes?code='+code).then(function(r){return r.json()}).then(function(d){cls=d.grades||{};var keys=Object.keys(cls);if(!keys.length){tt.innerHTML='<p class="muted">학급 정보가 없어 시간표를 보여 드릴 수 없어요.</p>';return}
gs.innerHTML='<option value="">학년</option>'+keys.map(function(g){return '<option value="'+g+'">'+g+'학년</option>'}).join('');var m=mine()||get('gj.tt.'+code);if(m&&m.grade&&cls[m.grade]){gs.value=m.grade;fill();if(m.cls&&cls[m.grade].indexOf(m.cls)>=0){cs.value=m.cls;load()}}}).catch(function(){})
})();</script>`;
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';

function detailHtml(s:School,today:string,week:MealDay[],todayMeal:MealDay|null,nextMeal:MealDay|null,events:Event[],failed:string[]){
  const lunch=todayMeal?.meals.find(m=>m.type==='중식')??todayMeal?.meals[0];
  const upcoming=events.filter(e=>(e.end??e.date)>=today&&bigEvent(e));
  const nextBig=upcoming.find(e=>e.date>today)??upcoming[0];  // 진행 중인 일정보다 다음 일정을 D-day로
  const vacation=upcoming.find(e=>/방학/.test(e.name)),exam=upcoming.find(e=>/고사|시험|평가/.test(e.name));
  const days=Array.from({length:5},(_,i)=>addDays(shownWeek(today).from,i));
  const answer=lunch?`오늘 ${esc(mdw(today))} ${esc(s.name)} ${esc(lunch.type)}은 <b>${esc(menuLine(lunch,5))}</b>${lunch.cal?` (${esc(lunch.cal)})`:''}이에요.`
    :failed.includes('meal')?'급식 정보를 잠시 불러오지 못했어요. 새로 고침해 주세요.'
    :`오늘 ${esc(mdw(today))}은 나이스에 올라온 급식이 없어요(휴업일이거나 학교가 아직 입력하지 않았어요).${nextMeal?` 다음 급식은 <b>${esc(mdw(nextMeal.date))}</b> ${esc(menuLine(nextMeal.meals.find(m=>m.type==='중식')??nextMeal.meals[0],4))}이에요.`:''}`;
  const facts:[string,string|null][]=[
    ['학교 종류',[s.kind,s.found,s.coedu,s.hs].filter(Boolean).join(' · ')],['주소',[s.address,s.detail].filter(Boolean).join(' ')||null],['전화',s.tel],
    ['홈페이지',s.homepage],['개교일',ymd(s.founded)],['관할',s.org],['영문 이름',s.eng],['주야',s.night?'야간':null],
  ];
  const lunchFaq=lunch?`${mdw(today)} ${s.name} ${lunch.type}은 ${lunch.dishes.map(d=>d.name).join(', ')}입니다${lunch.cal?`(${lunch.cal})`:''}.`
    :`${mdw(today)}에는 나이스에 올라온 ${s.name} 급식이 없습니다${nextMeal?`. 다음 급식은 ${mdw(nextMeal.date)}입니다`:''}.`;
  const faq:[string,string][]=([
    [`${s.name} 오늘 급식 메뉴는 무엇인가요?`,failed.includes('meal')?'':lunchFaq],
    [`${s.name} 다음 방학은 언제인가요?`,vacation?`학사일정에 ${eun(vacation.name)} ${eventDate(vacation)}(${dday(today,vacation.date)})로 올라와 있습니다.`:''],
    [`${s.name} 시험(고사)은 언제인가요?`,exam?`학사일정의 다음 시험 일정은 ${eventDate(exam)} ${exam.name}(${dday(today,exam.date)})입니다.`:''],
    [`${eun(s.name)} 어디에 있나요?`,s.address?`${[s.address,s.detail].filter(Boolean).join(' ')}에 있는 ${[s.found,s.coedu].filter(Boolean).join(' ')} ${s.kind}입니다${s.tel?`(전화 ${s.tel})`:''}.`:''],
  ] as [string,string][]).filter(([,x])=>x);
  const ld={'@context':'https://schema.org','@type':s.k==='elem'?'ElementarySchool':s.k==='middle'?'MiddleSchool':s.k==='high'?'HighSchool':'School',name:s.name,url:SITE+schoolPath(s.code),image:SITE+'/og.png',
    ...(s.eng?{alternateName:s.eng}:{}),...(s.address?{address:{'@type':'PostalAddress',streetAddress:[s.address,s.detail].filter(Boolean).join(' '),addressLocality:s.region_name.split(' ').slice(1).join(' ')||s.region_name,addressRegion:s.region_name.split(' ')[0],postalCode:s.zip??undefined,addressCountry:'KR'}}:{}),
    ...(s.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:s.lat,longitude:s.lon}}:{}),...(s.tel?{telephone:s.tel}:{}),...(s.homepage?{sameAs:s.homepage}:{}),...(s.founded?{foundingDate:ymd(s.founded)!.replace(/\./g,'-')}:{}),
    ...(upcoming.length?{event:upcoming.slice(0,5).map(e=>({'@type':'Event',name:`${s.name} ${e.name}`,startDate:`${e.date.slice(0,4)}-${e.date.slice(4,6)}-${e.date.slice(6,8)}`,...(e.end?{endDate:`${e.end.slice(0,4)}-${e.end.slice(4,6)}-${e.end.slice(6,8)}`}:{}),eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',eventStatus:'https://schema.org/EventScheduled',
      location:{'@type':'Place',name:s.name,address:[s.address,s.detail].filter(Boolean).join(' ')||s.region_name},organizer:{'@type':'Organization',name:s.name,url:SITE+schoolPath(s.code)},description:`${s.name} 학사일정: ${e.name}`,image:SITE+'/og.png'}))}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내 학교',SITE+'/'],['지역별 학교',SITE+'/region'],...(s.region.includes('기타')?[]:[[s.region_name,`${SITE}/region/${s.region}`]]),[s.name,SITE+schoolPath(s.code)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const map=s.lat!=null?`https://map.kakao.com/link/map/${encodeURIComponent(s.name)},${s.lat},${s.lon}`:s.address?`https://map.kakao.com/?q=${encodeURIComponent(s.address)}`:null;
  const byDate=new Map(week.map(d=>[d.date,d]));
  const monthEvents=events.filter(e=>e.date>=addDays(today,-7)&&e.date<=addDays(today,62)&&bigEvent(e));
  return `<div id="sc-page" data-code="${esc(s.code)}" data-name="${esc(s.name)}" data-kind="${esc(s.kind)}" data-k="${esc(s.k)}">
<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별 학교</a> › ${s.region.includes('기타')?'':`<a href="/region/${esc(s.region)}">${esc(s.region_name)}</a> › `}${esc(s.name)}</nav>
<div class="sc-head"><h1>${esc(s.name)} <small>급식·학사일정·시간표</small></h1><p>${esc([s.kind,s.found,s.region_name].filter(Boolean).join(' · '))}</p>
<div class="sc-actions"><button type="button" class="sc-save" id="sc-save">☆ 내 학교로 저장</button><button type="button" class="gj-share">📤 공유하기</button>${map?`<a href="${esc(map)}" rel="noopener" target="_blank">🧭 지도</a>`:''}${s.homepage?`<a href="${esc(s.homepage)}" rel="noopener nofollow" target="_blank">🏠 학교 홈페이지</a>`:''}</div></div>
<p class="sc-answer">🍱 ${answer}</p>
${nextBig?`<div class="sc-dday"><b>${esc(dday(today,nextBig.date))}</b><span>${esc(nextBig.name)} · ${esc(eventDate(nextBig))}</span></div>`:''}
${todayMeal?`<section><h2>오늘 급식 <span class="muted">${esc(mdw(today))}</span></h2><div class="sc-meals">${todayMeal.meals.map(mealHtml).join('')}</div></section>`:''}
<section><h2>이번 주 급식 <span class="muted">${esc(mdw(days[0]))} ~ ${esc(mdw(days[4]))}</span></h2>
<div class="sc-week">${days.map(d=>{const m=byDate.get(d);const l=m?.meals.find(x=>x.type==='중식')??m?.meals[0];return `<div class="sc-day${d===today?' today':''}"><div class="sc-day-head"><b>${esc(weekday(d))}</b><span>${+d.slice(4,6)}/${+d.slice(6,8)}</span>${l?.cal?`<small>${esc(l.cal)}</small>`:''}</div>${l?dishHtml(l):'<p class="muted small">급식 없음</p>'}</div>`;}).join('')}</div>
${failed.includes('meal')?'<p class="muted small">급식 정보를 잠시 불러오지 못했어요.</p>':''}
<details class="sc-allergy-box"><summary>⚠️ 알레르기 표시하기 (내 아이 알레르기를 고르면 해당 메뉴를 빨갛게)</summary><div id="sc-allergy" class="sc-allergy">${ALLERGENS.slice(1).map((a,i)=>`<button type="button" data-n="${i+1}">${i+1}. ${esc(a)}</button>`).join('')}</div><p class="muted small">고른 항목은 이 브라우저에만 저장돼요. 메뉴 옆 작은 글씨가 그 메뉴의 알레르기 유발 식품이에요.</p></details>
</section>
<section><h2>학사일정 <span class="muted">다가오는 일정</span></h2>${monthEvents.length?`<ul class="sc-events">${monthEvents.map(e=>`<li class="${(e.end??e.date)<today?'past':''}${e.off?' off':''}"><span class="sc-ev-date">${esc(eventDate(e))}</span><b>${esc(e.name)}</b>${e.date>today?`<em>${esc(dday(today,e.date))}</em>`:(e.end??e.date)>=today?'<em>진행 중</em>':''}${e.grades.length&&e.grades.length<GRADES_OF[s.k]?`<small>${e.grades.join('·')}학년</small>`:''}</li>`).join('')}</ul>`:`<p class="muted">${failed.includes('schedule')?'학사일정을 잠시 불러오지 못했어요.':'앞으로 두 달 안에 올라온 학사일정이 없어요.'}</p>`}</section>
${TIMETABLE_API[s.k]?`<section id="sc-tt"><h2>시간표 <span class="muted">이번 주</span></h2><div class="sc-tt-pick"><select id="sc-grade" aria-label="학년"><option value="">학년</option></select><select id="sc-class" aria-label="반"><option value="">반</option></select><span class="muted small">학년·반을 고르면 이 브라우저에 기억해요</span></div><div id="sc-tt-out"></div></section>`:''}
<section><h2>학교 정보</h2><dl class="sc-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${k==='홈페이지'?`<a href="${esc(v)}" rel="noopener nofollow" target="_blank">${esc(v)}</a>`:esc(v)}</dd></div>`).join('')}</dl>
${s.region.includes('기타')?'':`<p><a class="sc-more-link" href="/region/${esc(s.region)}">${esc(s.region_name)} 학교 모두 보기 →</a></p>`}</section>
${connectHtml(s)}
${faq.length?`<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>`:''}
<p class="muted small">출처: 나이스(NEIS) 교육정보 개방 포털(학교기본정보·급식식단정보·학사일정·시간표). 학교가 입력한 내용이라 바뀔 수 있으니 중요한 일정은 학교 안내를 확인하세요.</p>
</div>${ldTag(ld)}${ldTag(crumbs)}${faq.length?ldTag(faqLd):''}`;
}

async function detail(s:School,url:URL,env:Env,ctx:ExecutionContext){
  const today=kstDay(),hour=new Date(Date.now()+9*3600e3).getUTCHours();
  // 날짜가 바뀌면 새 화면(급식은 학교가 고칠 수 있어 3시간 단위로 다시 만듦).
  const key=new Request(`${url.origin}/school/${s.code}?d=${today}&h=${Math.floor(hour/3)}&v=${encodeURIComponent(D.status.updated_at)}&t=2`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const failed:string[]=[];
  const w=shownWeek(today);
  const [ms,ev]=await Promise.all([
    meals(env,ctx,s,w.from<today?w.from:today,addDays(w.to>today?w.to:today,14)).catch(e=>{console.error(e);failed.push('meal');return [] as MealDay[];}),
    schedule(env,ctx,s,today).catch(e=>{console.error(e);failed.push('schedule');return [] as Event[];}),
  ]);
  const todayMeal=ms.find(d=>d.date===today)??null,nextMeal=ms.find(d=>d.date>today)??null;
  const lunch=todayMeal?.meals.find(m=>m.type==='중식')??todayMeal?.meals[0];
  const title=`${s.name} 급식·학사일정·시간표 | 내 학교`;
  const desc=(lunch?`오늘(${mdw(today)}) ${s.name} ${lunch.type}: ${menuLine(lunch,5)}.`:`${s.region_name} ${s.name}(${s.kind}).`)+' 이번 주 급식·알레르기, 학사일정 D-day, 학년·반 시간표를 한눈에.';
  const canonical=SITE+schoolPath(s.code);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png"/><meta property="og:site_name" content="내 학교"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="school-detail">SCHOOL_DETAIL<\/div>/,detailHtml(s,today,ms.filter(d=>d.date>=w.from&&d.date<=w.to),todayMeal,nextMeal,ev,failed))
    .replace('</body>',AD_FILL+PAGE_JS+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=600'}});
  if(!failed.length)ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/search')return search(url);
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:D.status,neis_key:!!env.NEIS_API_KEY},200,60);
      if(url.pathname.startsWith('/api/')){
        const s=BY_CODE.get(p.get('code')??'');if(!s)return json({error:'unknown school'},404,3600);
        const today=kstDay();
        if(url.pathname==='/api/today')return json(await todayOf(env,ctx,s,p.get('grade'),p.get('class')),200,600);
        if(url.pathname==='/api/meal'){const from=/^\d{8}$/.test(p.get('from')??'')?p.get('from')!:today,to=/^\d{8}$/.test(p.get('to')??'')?p.get('to')!:addDays(from,6);
          if(dayDiff(from,to)<0||dayDiff(from,to)>62)return json({error:'range'},400,0);return json({days:await meals(env,ctx,s,from,to)},200,1800);}
        if(url.pathname==='/api/schedule')return json({today,events:await schedule(env,ctx,s,today)},200,3600);
        if(url.pathname==='/api/classes')return json({grades:await classes(env,ctx,s,today)},200,3600);
        if(url.pathname==='/api/timetable'){const g=p.get('grade')??'',c=p.get('class')??'';if(!/^\d{1,2}$/.test(g)||!c||c.length>10)return json({error:'grade/class'},400,0);
          const w=shownWeek(today);const days=await timetable(env,ctx,s,g,c,w.from,w.to);
          return json({today,days:days.map(d=>({...d,label:`${weekday(d.date)} ${+d.date.slice(4,6)}/${+d.date.slice(6,8)}`}))},200,1800);}
        return json({error:'not found'},404,3600);
      }
      const m=url.pathname.match(/^\/school\/([0-9A-Z]{5,12})\/?$/);
      if(m){const s=BY_CODE.get(m[1]);if(s)return await detail(s,url,env,ctx);}
      if(url.pathname==='/school/shell'||url.pathname==='/school/shell.html'||m){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
