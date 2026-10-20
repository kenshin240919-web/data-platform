// Cloudflare Worker for academy.guidejung.com (내근처 학원). Static pages: ./out (Next.js export).
// D1 guidejung-academy (scripts/build-academy-d1.mjs): /api/search, 학원 상세 /academy/{id} (server-rendered into the
// static template /academy/shell so header·footer·scripts match), /sitemap.xml + /sitemap-academies-{n}.xml.
import {academyPath,esc,eun,feeRange,GRADES,n,SITE,SUBJECTS,subjectLabel,won,ymd,type Card} from '../lib/fmt';

interface Env{ASSETS:Fetcher;DB:D1Database}
type Academy=Card&{office_name:string|null;zone:string|null;region_name:string;region_id:string;realms:string[];courses:{order:string|null;course:string|null;list:string|null;realm:string|null}[];
  fees:{name:string;won:number;subjects:string[];grades:string[]}[];fee_public:boolean;capacity:number|null;capacity_now:number|null;boarding:boolean;
  established:string|null;registered:string|null;closed_from:string|null;closed_until:string|null;address_detail:string|null;zip:string|null;tel:string|null;loaded:string|null};

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
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
function detailHtml(a:Academy,near:Card[]){
  const subj=a.subjects.map(subjectLabel),grades=a.grades.map(g=>GRADES[g]);
  const fees=[...a.fees].sort((x,y)=>x.won-y.won);
  const okFees=fees.filter(f=>f.won>=10000&&f.won<=3000000);
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
  ].filter(([,x])=>x) as [string,string][];
  const ld={'@context':'https://schema.org','@type':'EducationalOrganization',name:a.name,url:SITE+academyPath(a.id),
    ...(a.address?{address:{'@type':'PostalAddress',streetAddress:[a.address,a.address_detail].filter(Boolean).join(' '),postalCode:a.zip??undefined,addressCountry:'KR'}}:{}),
    ...(a.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:a.lat,longitude:a.lon}}:{}),...(a.tel?{telephone:a.tel}:{}),...(a.established?{foundingDate:ymd(a.established)!.replace(/\./g,'-')}:{}),
    ...(okFees.length?{hasOfferCatalog:{'@type':'OfferCatalog',name:'교습 과정 수강료',itemListElement:okFees.slice(0,30).map(f=>({'@type':'Offer',itemOffered:{'@type':'Course',name:f.name,provider:{'@type':'Organization',name:a.name}},price:f.won,priceCurrency:'KRW'}))}}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 학원',SITE+'/'],['지역별 학원',SITE+'/region'],[a.region_name,`${SITE}/region/${a.region_id}`],[a.name,SITE+academyPath(a.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const map=a.lat!=null?`https://map.kakao.com/link/map/${encodeURIComponent(a.name)},${a.lat},${a.lon}`:a.address?`https://map.kakao.com/?q=${encodeURIComponent(a.address)}`:null;
  const subjectLinks=a.subjects.slice(0,3).map(k=>`<a class="sub" href="/region/${esc(a.region_id)}/${k}">${esc(a.region_name)} ${esc(SUBJECTS[k])} 학원 비교</a>`).join('');
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별 학원</a> › <a href="/region/${esc(a.region_id)}">${esc(a.region_name)}</a> › ${esc(a.name)}</nav>
<div class="ac-detail-head"><h1>${esc(a.name)}</h1><p>${esc([a.type,a.region_name].filter(Boolean).join(' · '))}</p>
<div class="ac-tags">${[...subj,...grades].map(t=>`<span>${esc(t)}</span>`).join('')}</div></div>
<p class="ac-answer">${fee?`교육청에 공개된 수강료는 <b>${esc(fee)}</b>${okFees.length>1?`(과정 ${n(okFees.length)}개)`:''}이에요.`:'교육청에 공개된 수강료 금액이 없어요. 학원에 직접 문의해 주세요.'}</p>
<div class="ac-actions"><button type="button" class="ac-pick-big" id="ac-pick" data-id="${esc(a.id)}" data-name="${esc(a.name)}">+ 비교에 담기</button>${map?`<a href="${esc(map)}" rel="noopener" target="_blank">🧭 지도·길찾기</a>`:''}${a.tel?`<a class="sub" href="tel:${esc(a.tel.replace(/[^0-9]/g,''))}">📞 전화</a>`:''}${subjectLinks}</div>
${fees.length?`<section><h2>과정별 수강료</h2><ul class="ac-fees">${fees.map(f=>`<li><span>${esc(f.name)}</span><b>${esc(won(f.won))}</b></li>`).join('')}</ul><p class="muted small">교육청에 신고·공개된 인당 수강료(기간 표기 없음, 교재비 등 제외될 수 있음). 실제 수강료는 학원에 확인하세요.</p></section>`:''}
<section><h2>학원 정보</h2><dl class="ac-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${near.length?`<section><h2>근처 같은 과목 학원</h2><div class="ac-cards">${near.map(c=>`<a class="ac-card" href="${academyPath(c.id)}"><span class="ac-card-body"><b>${esc(c.name)}</b><small class="muted">${c.km!=null?`📍 ${c.km<1?`${Math.round(c.km*1000)}m`:`${c.km.toFixed(1)}km`} · `:''}${esc(c.subjects.slice(0,3).map(subjectLabel).join(' · '))}</small></span><span class="${feeRange(c)?'ac-fee':'ac-fee none'}">${esc(feeRange(c)??'수강료 미공개')}</span></a>`).join('')}</div><p><a class="ac-more-link" href="/region/${esc(a.region_id)}">${esc(a.region_name)} 학원 모두 보기 →</a></p></section>`:''}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: 나이스(NEIS) 교육정보 개방 포털 학원교습소정보. 잘못된 정보는 관할 교육지원청에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${faq.length?ldTag(faqLd):''}`;
}

async function detail(id:string,url:URL,env:Env,ctx:ExecutionContext){
  const v=await version(env);
  const key=new Request(`${url.origin}/academy/${id}?v=${encodeURIComponent(v)}&t=2`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const row=await env.DB.prepare('SELECT body FROM academies WHERE id = ?').bind(id).first<{body:string}>();
  if(!row)return null;
  const a=JSON.parse(row.body) as Academy;
  let near:Card[]=[];
  if(a.lat!=null&&a.lon!=null){
    const k=a.subjects[0];const d=.03;
    const {results}=await env.DB.prepare(`SELECT card FROM academies WHERE lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND id != ?${k?' AND subjects LIKE ?':''} ORDER BY rank DESC LIMIT 40`)
      .bind(a.lat-d,a.lat+d,a.lon-d*1.25,a.lon+d*1.25,a.id,...(k?[`% ${k} %`]:[])).all<{card:string}>();
    near=results.map(r=>JSON.parse(r.card) as Card).map(c=>({...c,km:distKm(a.lat!,a.lon!,c.lat!,c.lon!)})).sort((x,y)=>Number(y.fee_min!=null)-Number(x.fee_min!=null)||x.km!-y.km!).slice(0,6);
  }
  const fee=feeRange(a);
  const title=`${a.name} 수강료·정보 | 내근처 학원`;
  const desc=`${a.region_name} ${a.name}(${[a.type,...a.subjects.slice(0,3).map(subjectLabel)].filter(Boolean).join('·')}). ${fee?`교육청 공개 수강료 ${fee}.`:''} 주소·교습과정·정원을 확인하세요.`.replace(/\s+/g,' ').trim();
  const canonical=SITE+academyPath(a.id);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png"/><meta property="og:site_name" content="내근처 학원"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="academy-detail">ACADEMY_DETAIL<\/div>/,detailHtml(a,near))
    .replace('</body>',AD_FILL+COMPARE_JS+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
async function sitemap(url:URL,env:Env){
  if(url.pathname==='/sitemap.xml'){
    const c=await env.DB.prepare('SELECT COUNT(*) AS n FROM academies').first<{n:number}>().catch(()=>null);
    const parts=['sitemap-pages.xml',...Array.from({length:Math.ceil((c?.n??0)/SITEMAP_SIZE)},(_,i)=>`sitemap-academies-${i+1}.xml`)];
    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${parts.map(p=>`<sitemap><loc>${SITE}/${p}</loc></sitemap>`).join('')}</sitemapindex>`);
  }
  const m=url.pathname.match(/^\/sitemap-academies-(\d+)\.xml$/);if(!m)return null;
  const {results}=await env.DB.prepare(`SELECT id FROM academies ORDER BY id LIMIT ${SITEMAP_SIZE} OFFSET ?`).bind((Number(m[1])-1)*SITEMAP_SIZE).all<{id:string}>();
  if(!results.length)return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${results.map(r=>`<url><loc>${SITE}${academyPath(r.id)}</loc></url>`).join('')}</urlset>`);
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url);
    try{
      if(url.pathname==='/api/search')return await search(url,env);
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
