// Cloudflare Worker for academy.guidejung.com (내근처 학원). Static pages: ./out (Next.js export).
// D1 guidejung-academy (scripts/build-academy-d1.mjs): /api/search, 학원 상세 /academy/{id} (server-rendered into the
// static template /academy/shell so header·footer·scripts match), /sitemap.xml + /sitemap-academies-{n}.xml.
import {FEE_MAX,FEE_MIN,academyPath,esc,eun,feeRange,GRADES,man,n,SITE,SUBJECTS,subjectLabel,won,ymd,type Card,type FeeStats} from '../lib/fmt';

import weatherRegions from '../../weather/data/regions.json';
import {actionsHtml} from '../../../packages/ui/src/actions';
import {blogHtml} from '../../../packages/ui/src/live';

// 학원 상세 → 다른 내근처 사이트(클릭·체류): 가장 가까운 시군구(weather 지역표)로 날씨·충전소, 좌표로 여행 검색.
type WR={code:string;name:string;sidoShort:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
function connectHtml(a:{lat:number|null;lon:number|null;region_name:string}){
  if(a.lat==null||a.lon==null)return '';
  const r=WREG.reduce((x,y)=>distKm(a.lat!,a.lon!,y.lat,y.lon)<distKm(a.lat!,a.lon!,x.lat,x.lon)?y:x);
  const charge=r.name.includes(' ')?r.code.slice(0,4)+'0':r.code,ll=`lat=${a.lat.toFixed(4)}&lon=${a.lon.toFixed(4)}`;
  const items:[string,string,string,string][]=[
    ['🧒','근처 아이와 갈 만한 곳','수업 끝나고 들르기 좋은 5km 안 아이 동반 장소',`https://trip.guidejung.com/search?${ll}&radius_km=5&condition=kids`],
    ['🌤️',`${a.region_name} 등하원 날씨`,'비·미세먼지·옷차림 미리 확인',`https://weather.guidejung.com/region/${r.code}`],
    ['🍜','근처 맛집','픽업 기다리며 들를 3km 안 맛집',`https://trip.guidejung.com/search?${ll}&radius_km=3&kind=food`],
    ['⚡','근처 전기차 충전소','학원 기다리는 동안 충전',`https://charge.guidejung.com/region/${charge}`],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,h])=>`<a href="${esc(h)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}

interface Env{ASSETS:Fetcher;DB:D1Database}
type Academy=Card&{office_name:string|null;zone:string|null;region_name:string;region_id:string;realms:string[];courses:{order:string|null;course:string|null;list:string|null;realm:string|null}[];
  fees:{name:string;won:number;subjects:string[];grades:string[]}[];fee_public:boolean;capacity:number|null;capacity_now:number|null;boarding:boolean;
  established:string|null;registered:string|null;closed_from:string|null;closed_until:string|null;address_detail:string|null;zip:string|null;tel:string|null;loaded:string|null;
  around?:{n:number;top:string[];subject:string|null;same:number;same_fee:number|null}|null;schools?:{code:string;name:string;k:'elem'|'middle'|'high';m:number}[]};
// D1 regions.stats·meta nation (scripts/collect-academy.py region_stats): the detail page compares an academy with these.
type Stats={subjects?:Record<string,FeeStats>;cap?:Record<string,number>};

// 사이트맵 단계(academies.stage): 1 정적 지역·과목 페이지에서 링크된 곳 → 2 수강료 공개 → 3 전부. 새 사이트는 구글이 천천히 읽어서
// 좋은 페이지부터 내고, 서치 콘솔 색인 수가 늘면 숫자를 올림(10/27 1단계 약 9,300곳).
const SITEMAP_STAGE=1;
const PAGE=20,SITEMAP_SIZE=40000;
const json=(d:unknown,status=200,maxAge=300)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const version=async(env:Env)=>(await env.DB.prepare("SELECT value FROM meta WHERE key='version'").first<{value:string}>().catch(()=>null))?.value??'0';

async function search(url:URL,env:Env){
  const p=url.searchParams;const where:string[]=[],args:unknown[]=[];
  const subject=p.get('subject'),grade=p.get('grade'),region=p.get('region'),q=(p.get('q')??'').trim().toLowerCase().slice(0,40);
  if(subject&&/^[a-z]+$/.test(subject)){where.push('subjects LIKE ?');args.push(`% ${subject} %`);}
  if(grade&&/^[a-z]+$/.test(grade)){where.push('grades LIKE ?');args.push(`% ${grade} %`);}
  if(region){where.push('region_id = ?');args.push(region);}
  for(const w of q.split(/\s+/).filter(Boolean).slice(0,4)){where.push('text LIKE ?');args.push(`%${w}%`);}
  const page=Math.max(1,Math.min(50,num(p.get('page'))??1));
  const lat=num(p.get('lat')),lon=num(p.get('lon'));
  if(lat!==null&&lon!==null){
    // 내 주변: 위·경도 상자로 거르고 거리순 정렬 → 그 페이지 카드만 읽음 (trip /api/search와 같은 방식).
    const km=Math.max(.5,Math.min(30,num(p.get('km'))??2));const dLat=km/111,dLon=km/(111*Math.cos(lat*Math.PI/180));
    where.push('lat BETWEEN ? AND ?','lon BETWEEN ? AND ?');args.push(lat-dLat,lat+dLat,lon-dLon,lon+dLon);
    const {results}=await env.DB.prepare(`SELECT id,lat,lon,fee_min IS NOT NULL AS fee FROM academies WHERE ${where.join(' AND ')}`).bind(...args).all<{id:string;lat:number;lon:number;fee:number}>();
    // 수강료가 공개된 학원을 먼저(10/20 사용자), 그 안에서 가까운 순.
    const near=results.map(r=>({id:r.id,fee:r.fee,km:distKm(lat,lon,r.lat,r.lon)})).filter(r=>r.km<=km).sort((a,b)=>b.fee-a.fee||a.km-b.km);
    const slice=near.slice((page-1)*PAGE,page*PAGE);
    const cards=slice.length?(await env.DB.prepare(`SELECT id,card FROM academies WHERE id IN (${slice.map(()=>'?').join(',')})`).bind(...slice.map(s=>s.id)).all<{id:string;card:string}>()).results:[];
    const byId=new Map(cards.map(c=>[c.id,JSON.parse(c.card) as Card]));
    return json({total:near.length,items:slice.map(s=>({...byId.get(s.id)!,km:Math.round(s.km*100)/100})).filter(c=>c.id)});
  }
  const w=where.length?`WHERE ${where.join(' AND ')}`:'';
  const [count,rows]=await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM academies ${w}`).bind(...args).first<{n:number}>(),
    env.DB.prepare(`SELECT card FROM academies ${w} ORDER BY rank DESC, id LIMIT ${PAGE} OFFSET ${(page-1)*PAGE}`).bind(...args).all<{card:string}>(),
  ]);
  return json({total:count?.n??0,items:rows.results.map(r=>JSON.parse(r.card))});
}

// The static template page (/academy/shell) with Next's client scripts removed: the detail HTML is not React output,
// so hydrating it would replace the content. Ads, GA and Clarity scripts stay.
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/academy/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});

// 상세 페이지(하이드레이션 없음)의 비교 담기 버튼·비교함 띠: lib/compare.ts와 같은 키(gj.compare)·최대 4곳.
const COMPARE_JS=`<script>(function(){var K='gj.compare',b=document.getElementById('ac-pick');function g(){try{return JSON.parse(localStorage.getItem(K)||'[]')}catch(e){return[]}}
function draw(){var v=g(),on=b&&v.some(function(x){return x.id===b.dataset.id});if(b){b.textContent=on?'✓ 비교함에 담김':'+ 비교에 담기';b.className=on?'ac-pick-big on':'ac-pick-big'}
var d=document.getElementById('ac-cbar');if(!v.length){if(d)d.remove();return}if(!d){d=document.createElement('div');d.id='ac-cbar';d.className='ac-comparebar';document.body.appendChild(d)}
d.innerHTML='';var s=document.createElement('span');s.textContent='⚖️ 비교함 '+v.length+'/4 · '+v.map(function(x){return x.name}).join(', ');var a=document.createElement('a');a.href='/compare';a.textContent='비교하기 →';d.appendChild(s);d.appendChild(a)}
if(b)b.addEventListener('click',function(){var v=g(),i=v.findIndex(function(x){return x.id===b.dataset.id});if(i>=0)v.splice(i,1);else if(v.length>=4){alert('비교는 최대 4곳까지예요. 비교함에서 하나를 빼 주세요.');return}else v.push({id:b.dataset.id,name:b.dataset.name});try{localStorage.setItem(K,JSON.stringify(v))}catch(e){}draw()});
window.addEventListener('storage',draw);draw()})();</script>`;
// 이 학원만의 내용(구글은 틀만 같고 데이터만 바뀐 페이지를 색인하지 않음): 한눈에 보기 문장, 지역·1km·전국과 수강료 비교,
// 가까운 학교(school 사이트 급식), 주변 학원가, 정원 규모. 문장·FAQ·메타 설명이 함께 씀.
const SCHOOL_K={elem:'초등학교',middle:'중학교',high:'고등학교'} as const;
const dist=(m:number)=>m<1000?`${n(m)}m`:`${(m/1000).toFixed(1)}km`;
const median=(v:number[])=>{const s=[...v].sort((x,y)=>x-y);return s[s.length>>1];};
function insight(a:Academy,st:Stats,nation:Record<string,FeeStats>){
  const region=a.region_name,ok=(f:{won:number})=>f.won>=FEE_MIN&&f.won<=FEE_MAX;
  // 과목별 이 학원 금액: 과정 이름에 과목이 있는 수강료의 중앙값(과목이 하나뿐이면 모든 과정).
  const own=(k:string)=>{const w=a.fees.filter(f=>ok(f)&&(f.subjects.includes(k)||a.subjects.length===1)).map(f=>f.won);return w.length?median(w):null;};
  const band=(v:number,s:FeeStats)=>!s||s.n<10||s.p25==null||s.p75==null?null:v<s.p25?'낮은 편(하위 25%)':v>s.p75?'높은 편(상위 25%)':'중간 수준';
  const rows=[...a.subjects].sort((x,y)=>Number(y===a.around?.subject)-Number(x===a.around?.subject)).filter(k=>st.subjects?.[k]||nation[k]).slice(0,4).map(k=>({k,own:own(k),reg:st.subjects?.[k]??null,nat:nation[k]??null,
    near:a.around?.subject===k?a.around.same_fee:null}));
  const lead=rows.find(r=>r.own!=null&&r.reg)??rows.find(r=>r.reg);
  const year=a.established?.slice(0,4),age=year?new Date(Date.now()+9*3600e3).getUTCFullYear()-Number(year)+1:null;
  const kind=a.type==='교습소'?'교습소로':'학원으로',subj=a.subjects.slice(0,3).map(subjectLabel),grades=a.grades.map(g=>GRADES[g]);
  const school=[...(a.schools??[])].sort((x,y)=>x.m-y.m)[0];
  const cap=a.capacity&&a.type?st.cap?.[a.type]:null;
  const size=cap?(a.capacity!<cap*.7?'규모가 작은 편이에요':a.capacity!>cap*1.5?'규모가 큰 편이에요':'보통 규모예요'):null;
  const ar=a.around;
  const feeLine=lead?lead.own!=null?`공개된 ${subjectLabel(lead.k)} 수강료 ${man(lead.own)}${band(lead.own,lead.reg)?`은 ${region} ${subjectLabel(lead.k)} 학원 가운데 ${band(lead.own,lead.reg)}이에요(지역 중앙값 ${man(lead.reg!.median)})`:`이에요(${region} 중앙값 ${man(lead.reg!.median)})`}.`
    :`수강료 금액은 공개하지 않았고, ${region} ${subjectLabel(lead.k)} 공개 수강료 중앙값은 ${man(lead.reg!.median)}이에요.`:null;
  const lines=[
    `${eun(a.name)} ${year?`${year}년에 문을 연(올해 ${age}년째) `:''}${region} ${kind}, ${grades.length?`${grades.join('·')} 대상 `:''}${subj.length?`${subj.join('·')} 과정을 운영해요.`:'교습 과정을 운영해요.'}`,
    feeLine,
    ar&&ar.n?`반경 1km 안에 학원·교습소 ${n(ar.n)}곳이 있고${ar.top.length?` ${ar.top.map(subjectLabel).join('·')} 학원이 많아요`:''}${ar.subject?`. 같은 ${subjectLabel(ar.subject)} 학원은 ${n(ar.same)}곳이에요.`:'.'}`:null,
    school?`가장 가까운 학교는 ${school.name}(${dist(school.m)})예요.`:null,
    size?`정원 ${n(a.capacity!)}명으로 ${region} ${a.type} 가운데 ${size}(지역 중앙값 ${n(cap!)}명).`:null,
  ].filter(Boolean) as string[];
  const cell=(s:FeeStats|null)=>s?`<b>${esc(man(s.median))}</b><small class="muted"> · ${n(s.n)}건</small>`:'–';
  const table=rows.length?`<section><h2>수강료, 이 동네와 비교하면</h2><table class="ac-table"><thead><tr><th>과목</th><th>이 ${esc(a.type??'학원')}</th><th>반경 1km</th><th>${esc(region)}</th><th>전국</th></tr></thead><tbody>${rows.map(r=>
    `<tr><th><a href="/region/${esc(a.region_id)}/${r.k}">${esc(subjectLabel(r.k))}</a></th><td>${r.own!=null?`<b>${esc(man(r.own))}</b>`:'<span class="muted">미공개</span>'}</td><td>${r.near!=null?esc(man(r.near)):'–'}</td><td>${cell(r.reg)}</td><td>${cell(r.nat)}</td></tr>`).join('')}</tbody></table>
<p class="muted small">교육청에 공개된 과정별 인당 수강료의 중앙값(기간 표기 없음, 3만 원 미만 제외). 반경 1km는 같은 과목 학원 공개 금액 5건 이상일 때만 보여요.</p></section>`:'';
  const schools=a.schools?.length?`<section><h2>가까운 학교</h2><ul class="ac-links">${a.schools.map(s=>`<li><a href="https://school.guidejung.com/school/${esc(s.code)}">${esc(s.name)}</a> <span class="muted">· ${SCHOOL_K[s.k]} · ${dist(s.m)} · 오늘 급식·학사일정</span></li>`).join('')}</ul></section>`:'';
  const around=ar&&ar.n?`<section><h2>주변 학원가</h2><p>반경 1km 안 학원·교습소 <b>${n(ar.n)}곳</b>${ar.top.length?` · 많은 과목 ${ar.top.map(k=>`<a href="/region/${esc(a.region_id)}/${k}">${esc(subjectLabel(k))}</a>`).join('·')}`:''}${ar.subject?` · 같은 ${esc(subjectLabel(ar.subject))} 학원 <b>${n(ar.same)}곳</b>${ar.same_fee?`(공개 수강료 중앙값 ${esc(man(ar.same_fee))})`:''}`:''}</p></section>`:'';
  const faq:[string,string][]=[
    ...(a.schools?.length?[[`${a.name} 근처 학교는 어디인가요?`,`${a.schools.map(s=>`${s.name} ${dist(s.m)}`).join(', ')} 거리에 있습니다(직선거리).`] as [string,string]]:[]),
    ...(lead?.own!=null&&band(lead.own,lead.reg)?[[`${a.name} 수강료는 이 동네보다 비싼가요?`,`${subjectLabel(lead.k)} 공개 수강료 ${man(lead.own)}은 ${region} ${subjectLabel(lead.k)} 학원 공개 금액 ${n(lead.reg!.n)}건 가운데 ${band(lead.own,lead.reg)}입니다(중앙값 ${man(lead.reg!.median)}).`] as [string,string]]:[]),
    ...(ar?.subject?[[`${a.name} 주변에 같은 과목 학원은 몇 곳인가요?`,`반경 1km 안에 ${subjectLabel(ar.subject)} 학원·교습소가 ${n(ar.same)}곳 있습니다(전체 학원·교습소 ${n(ar.n)}곳).`] as [string,string]]:[]),
  ];
  const desc=[school?`${school.name} ${dist(school.m)}.`:'',lead?.own!=null&&band(lead.own,lead.reg)?`${subjectLabel(lead.k)} 수강료 ${region}에서 ${band(lead.own,lead.reg)!.replace(/\(.*\)/,'')}.`:''].join(' ');
  return {top:`<section><h2>한눈에 보기</h2><p>${lines.map(esc).join(' ')}</p></section>${table}`,bottom:schools+around,faq,desc};
}

const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
function detailHtml(a:Academy,near:Card[],ins:ReturnType<typeof insight>){
  const subj=a.subjects.map(subjectLabel),grades=a.grades.map(g=>GRADES[g]);
  const fees=[...a.fees].sort((x,y)=>x.won-y.won);
  const okFees=fees.filter(f=>f.won>=FEE_MIN&&f.won<=FEE_MAX);
  const fee=feeRange(a);
  const facts:[string,string|null][]=[
    ['구분',a.type],['지역',a.region_name],['주소',[a.address,a.address_detail].filter(Boolean).join(' ')||null],['전화',a.tel],
    ['교습 과정',[...new Set(a.courses.map(c=>[c.order,c.course].filter(Boolean).join(' · ')).filter(Boolean))].join(', ')||null],
    ['교습 과목(목록)',[...new Set(a.courses.map(c=>c.list).filter(Boolean))].join(', ')||null],
    ['정원',a.capacity?`${n(a.capacity)}명`:null],['일시 수용 인원',a.capacity_now?`${n(a.capacity_now)}명`:null],
    ['개설일',ymd(a.established)],['기숙사',a.boarding?'기숙학원':null],['교육청',a.office_name],['정보 기준일',ymd(a.loaded)],
  ];
  const faq:[string,string][]=[
    [`${a.name} 수강료는 얼마인가요?`,okFees.length?`교육청에 공개된 수강료는 ${okFees.slice(0,5).map(f=>`${f.name} ${won(f.won)}`).join(', ')}${okFees.length>5?` 등 ${n(okFees.length)}개 과정`:''}입니다. 실제 수강료는 학원에 확인하세요.`:'교육청에 공개된 수강료 금액이 없습니다. 학원에 직접 문의하세요.'],
    [`${eun(a.name)} 어디에 있나요?`,a.address?`${[a.address,a.address_detail].filter(Boolean).join(' ')}에 있습니다.`:''],
    [`${a.name}에서는 무엇을 가르치나요?`,subj.length?`${subj.join('·')} 과정을 운영합니다${grades.length?`(${grades.join('·')} 대상 과정 포함)`:''}.`:''],
    ...ins.faq,
  ].filter(([,x])=>x) as [string,string][];
  const ld={'@context':'https://schema.org','@type':'EducationalOrganization',name:a.name,url:SITE+academyPath(a.id),
    image:SITE+'/og.png',...(a.address?{address:{'@type':'PostalAddress',streetAddress:[a.address,a.address_detail].filter(Boolean).join(' '),addressLocality:a.region_name.split(' ').slice(1).join(' ')||a.region_name,addressRegion:a.office_name?.replace(/교육청$/,'')??undefined,postalCode:a.zip??undefined,addressCountry:'KR'}}:{}),
    ...(a.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:a.lat,longitude:a.lon}}:{}),...(a.tel?{telephone:a.tel}:{}),...(a.established?{foundingDate:ymd(a.established)!.replace(/\./g,'-')}:{}),
    ...(okFees.length?{hasOfferCatalog:{'@type':'OfferCatalog',name:'교습 과정 수강료',itemListElement:okFees.slice(0,30).map(f=>({'@type':'Offer',itemOffered:{'@type':'Course',name:f.name,description:`${a.name}의 ${f.name} 과정. 교육청에 공개된 인당 수강료 ${won(f.won)}(${a.region_name}).`,provider:{'@type':'Organization',name:a.name}},price:f.won,priceCurrency:'KRW'}))}}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 학원',SITE+'/'],['지역별 학원',SITE+'/region'],[a.region_name,`${SITE}/region/${a.region_id}`],[a.name,SITE+academyPath(a.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const map=a.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(a.name)},${a.lat},${a.lon}`:a.address?`https://map.kakao.com/?q=${encodeURIComponent(a.address)}`:null;
  const subjectLinks=a.subjects.slice(0,3).map(k=>`<a class="sub" href="/region/${esc(a.region_id)}/${k}">${esc(a.region_name)} ${esc(SUBJECTS[k])} 학원 비교</a>`).join('');
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별 학원</a> › <a href="/region/${esc(a.region_id)}">${esc(a.region_name)}</a> › ${esc(a.name)}</nav>
<div class="ac-detail-head"><h1>${esc(a.name)}</h1><p>${esc([a.type,a.region_name].filter(Boolean).join(' · '))}</p>
<div class="ac-tags">${[...subj,...grades].map(t=>`<span>${esc(t)}</span>`).join('')}</div></div>${actionsHtml()}
<p class="ac-answer">${fee?`교육청에 공개된 수강료는 <b>${esc(fee)}</b>${okFees.length>1?`(과정 ${n(okFees.length)}개)`:''}이에요.`:'교육청에 공개된 수강료 금액이 없어요. 학원에 직접 문의해 주세요.'}</p>
<div class="ac-actions"><button type="button" class="ac-pick-big" id="ac-pick" data-id="${esc(a.id)}" data-name="${esc(a.name)}">+ 비교에 담기</button>${map?`<a href="${esc(map)}" rel="noopener" target="_blank">🧭 길찾기</a>`:''}${a.tel?`<a class="sub" href="tel:${esc(a.tel.replace(/[^0-9]/g,''))}">📞 전화</a>`:''}${subjectLinks}</div>
${ins.top}
${fees.length?`<section><h2>과정별 수강료</h2><ul class="ac-fees">${fees.map(f=>`<li><span>${esc(f.name)}</span><b>${esc(won(f.won))}</b></li>`).join('')}</ul><p class="muted small">교육청에 신고·공개된 인당 수강료(기간 표기 없음, 교재비 등 제외될 수 있음). 실제 수강료는 학원에 확인하세요.</p></section>`:''}
${blogHtml(`${a.name} ${a.region_name.split(' ').slice(-1)[0]}`,a.name.replace(/\s*[([].*$/,'').trim(),'📝 학부모·수강생 블로그 후기 · 네이버')}
${blogHtml(`${a.name} ${a.region_name.split(' ').slice(-1)[0]}`,a.name.replace(/\s*[([].*$/,'').trim(),'💬 동네 카페 이야기 · 네이버 카페',true)}
<section><h2>학원 정보</h2><dl class="ac-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${ins.bottom}
${near.length?`<section><h2>근처 같은 과목 학원</h2><div class="ac-cards">${near.map(c=>`<a class="ac-card" href="${academyPath(c.id)}"><span class="ac-card-body"><b>${esc(c.name)}</b><small class="muted">${c.km!=null?`📍 ${c.km<1?`${Math.round(c.km*1000)}m`:`${c.km.toFixed(1)}km`} · `:''}${esc(c.subjects.slice(0,3).map(subjectLabel).join(' · '))}</small></span><span class="${feeRange(c)?'ac-fee':'ac-fee none'}">${esc(feeRange(c)??'수강료 미공개')}</span></a>`).join('')}</div><p><a class="ac-more-link" href="/region/${esc(a.region_id)}">${esc(a.region_name)} 학원 모두 보기 →</a></p></section>`:''}
${connectHtml(a)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: 나이스(NEIS) 교육정보 개방 포털 학원교습소정보. 잘못된 정보는 관할 교육지원청에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${faq.length?ldTag(faqLd):''}`;
}

async function detail(id:string,url:URL,env:Env,ctx:ExecutionContext){
  const v=await version(env);
  const key=new Request(`${url.origin}/academy/${id}?v=${encodeURIComponent(v)}&t=5`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const [rb,rs,rn]=await env.DB.batch<{body?:string;stats?:string;value?:string}>([env.DB.prepare('SELECT body FROM academies WHERE id = ?').bind(id),
    env.DB.prepare('SELECT r.stats FROM regions r JOIN academies a ON a.region_id = r.id WHERE a.id = ?').bind(id),env.DB.prepare("SELECT value FROM meta WHERE key='nation'")]);
  const row=rb.results[0];if(!row?.body)return null;
  const a=JSON.parse(row.body) as Academy;
  const ins=insight(a,JSON.parse(rs.results[0]?.stats??'{}'),JSON.parse(rn.results[0]?.value??'{}'));
  let near:Card[]=[];
  if(a.lat!=null&&a.lon!=null){
    const k=a.subjects[0];const d=.03;
    const {results}=await env.DB.prepare(`SELECT card FROM academies WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND id != ?${k?' AND subjects LIKE ?':''} ORDER BY rank DESC LIMIT 40`)
      .bind(a.lat-d,a.lat+d,a.lon-d*1.25,a.lon+d*1.25,a.id,...(k?[`% ${k} %`]:[])).all<{card:string}>();
    near=results.map(r=>JSON.parse(r.card) as Card).map(c=>({...c,km:distKm(a.lat!,a.lon!,c.lat!,c.lon!)})).sort((x,y)=>Number(y.fee_min!=null)-Number(x.fee_min!=null)||x.km!-y.km!).slice(0,6);
  }
  const fee=feeRange(a);
  const title=`${a.name} 수강료·정보 | 내근처 학원`;
  const desc=`${a.region_name} ${a.name}(${[a.type,...a.subjects.slice(0,3).map(subjectLabel)].filter(Boolean).join('·')}). ${fee?`교육청 공개 수강료 ${fee}.`:''} ${ins.desc} 주소·교습과정·정원을 확인하세요.`.replace(/\s+/g,' ').trim();
  const canonical=SITE+academyPath(a.id);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png"/><meta property="og:site_name" content="내근처 학원"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="academy-detail">ACADEMY_DETAIL<\/div>/,detailHtml(a,near,ins))
    .replace('</body>',AD_FILL+COMPARE_JS+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
async function sitemap(url:URL,env:Env){
  if(url.pathname==='/sitemap.xml'){
    const c=await env.DB.prepare('SELECT COUNT(*) AS n FROM academies WHERE stage <= ?').bind(SITEMAP_STAGE).first<{n:number}>().catch(()=>null);
    const parts=['sitemap-pages.xml',...Array.from({length:Math.ceil((c?.n??0)/SITEMAP_SIZE)},(_,i)=>`sitemap-academies-${i+1}.xml`)];
    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${parts.map(p=>`<sitemap><loc>${SITE}/${p}</loc></sitemap>`).join('')}</sitemapindex>`);
  }
  const m=url.pathname.match(/^\/sitemap-academies-(\d+)\.xml$/);if(!m)return null;
  const {results}=await env.DB.prepare(`SELECT id FROM academies WHERE stage <= ? ORDER BY stage, id LIMIT ${SITEMAP_SIZE} OFFSET ?`).bind(SITEMAP_STAGE,(Number(m[1])-1)*SITEMAP_SIZE).all<{id:string}>();
  if(!results.length)return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${results.map(r=>`<url><loc>${SITE}${academyPath(r.id)}</loc></url>`).join('')}</urlset>`);
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
    const url=new URL(req.url);
    try{
      if(url.pathname==='/api/search')return await edge(req,ctx,()=>search(url,env));
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/academies'){  // 비교함: ids=쉼표 목록(최대 4곳)
        const ids=(url.searchParams.get('ids')??'').split(',').filter(x=>/^\d{4,20}$/.test(x)).slice(0,4);
        if(!ids.length)return json({items:[]});
        const {results}=await env.DB.prepare(`SELECT body FROM academies WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all<{body:string}>();
        return json({items:results.map(r=>{const a=JSON.parse(r.body);return {id:a.id,name:a.name,type:a.type,region_name:a.region_name,region_id:a.region_id,address:a.address,tel:a.tel,subjects:a.subjects,grades:a.grades,fee_min:a.fee_min,fee_max:a.fee_max,fees:a.fees,capacity:a.capacity,established:a.established,courses:a.courses};})});}
      if(url.pathname==='/api/status'){const s=await env.DB.prepare("SELECT value FROM meta WHERE key='status'").first<{value:string}>().catch(()=>null);return json({status:s?JSON.parse(s.value):null,version:await version(env)},200,60);}
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      const m=url.pathname.match(/^\/academy\/(\d{4,20})\/?$/);
      if(m){const res=await detail(m[1],url,env,ctx);if(res)return res;}
      if(url.pathname==='/academy/shell'||url.pathname==='/academy/shell.html'||m){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
      if(url.pathname==='/sitemap.xml'||url.pathname.startsWith('/sitemap-academies-')){const res=await sitemap(url,env);if(res)return res;}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
