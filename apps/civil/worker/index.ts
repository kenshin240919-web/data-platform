// Cloudflare Worker for minwon.guidejung.com (내근처 서류). Static pages: ./out (Next.js export).
// The list ships with the Worker (data/places.json, scripts/collect-civil.py — 무인민원발급기·서류·주민센터·민원실·우체국·여권; no
// database), imported as text (wrangler.jsonc rules) and parsed on first use.
// Routes: /api/near, /api/search, /api/fav, /api/where, /api/status,
//   /api/wait?cso=   시·구청 민원실 실시간 대기(한국지역정보개발원 cso_realtime_v2, DATA_GO_KR_KEY, 1분 캐시)
//   /api/print?lat=&lon=   무인 프린트점·프린트카페: 카카오 로컬(반경) + NAVER API HUB 지역 검색을 방문 때마다 실시간(저장 안 함, no-store)
// 상세 /place/{id} (server-rendered into /place/shell), /sitemap.xml (index) → /sitemap-pages.xml (Next) + /sitemap-places-1.xml.
// 위치: 브라우저는 약 2km 칸 중심만 보낸다(packages/ui/src/geo.tsx) — 여기 오는 lat/lon은 칸 중심.
import raw from '../data/places.json';
import weatherRegions from '../../weather/data/regions.json';
import {ADS,DOCS,distKm,esc,eun,hoursLine,KIND_ORDER,KINDS,km,mapUrl,naverUrl,placePath,SITE,slim,stateOf,telHref,type Kind,type Place} from '../lib/fmt';
import {actionsHtml} from '../../../packages/ui/src/actions';
import {aroundHtml} from '../../../packages/ui/src/live';

interface Env{ASSETS:Fetcher;DATA_GO_KR_KEY?:string;KAKAO_REST_KEY?:string;NAVER_HUB_CLIENT_ID?:string;NAVER_HUB_CLIENT_SECRET?:string}
type Data={status:{updated_at:string;count:number};docs:[string,string][];items:Place[]};
let parsed:Data|null=null,byId:Map<string,Place>|null=null,docSets:Map<string,Set<number>>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const get=(id:string)=>(byId??=new Map(data().items.map(p=>[p.id,p]))).get(id);
const docSet=(slug:string)=>(docSets??=new Map(DOCS.map(d=>[d.slug,new Set(data().docs.map(([name],i)=>d.q.test(name)?i:-1).filter(i=>i>=0))]))).get(slug);
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':maxAge?`public, max-age=${maxAge}`:'no-store','access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();
type Near=Place&{km:number};

/** 반경 안 곳을 가까운 순으로. per: 종류마다 per곳씩, counts: 종류별 전체 수, open: 지금 운영 중인 무인민원발급기 수. */
function near(lat:number,lon:number,radius:number,opt:{limit?:number;per?:number;kinds?:Kind[]|null;skip?:string;doc?:Set<number>|null;openOnly?:boolean}){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180));
  const out:Near[]=[];const counts=Object.fromEntries(KIND_ORDER.map(k=>[k,0])) as Record<Kind,number>;let open=0;
  for(const p of data().items){
    if(p.lat==null||p.id===opt.skip||Math.abs(p.lat-lat)>dLat||Math.abs(p.lon!-lon)>dLon)continue;
    if(opt.kinds&&!opt.kinds.includes(p.kind))continue;
    if(opt.doc&&(p.kind!=='kiosk'||!p.docs?.some(i=>opt.doc!.has(i))))continue;
    const d=distKm(lat,lon,p.lat,p.lon!);if(d>radius)continue;
    const st=p.kind==='kiosk'?stateOf(p).state!=='closed':false;
    if(opt.openOnly&&p.kind==='kiosk'&&!st)continue;
    counts[p.kind]++;if(st)open++;out.push({...p,km:Math.round(d*100)/100});
  }
  out.sort((a,b)=>a.km-b.km);
  let items=out;
  if(opt.per){const seen:Record<string,number>={};items=out.filter(p=>(seen[p.kind]=(seen[p.kind]??0)+1)<=opt.per!);}
  return {total:out.length,counts,open,items:items.slice(0,opt.limit??200)};
}

// ---- 실시간: 민원실 대기 · 무인 프린트 ------------------------------------------------------------------------------------
async function wait(env:Env,p:Place,ctx:ExecutionContext){
  const key=new Request(`https://cache.minwon.internal/wait/${p.stdg}/${Math.floor(Date.now()/60e3)}`);
  const hit=await caches.default.match(key);let rows:Record<string,string>[]|null=hit?await hit.json():null;
  if(!rows){
    if(!env.DATA_GO_KR_KEY)return json({error:'service key missing'},503,0);
    const q=new URLSearchParams({serviceKey:env.DATA_GO_KR_KEY,pageNo:'1',numOfRows:'100',type:'json',stdgCd:p.stdg??''});
    // data.go.kr은 해외(Cloudflare) 요청에 가끔 늦거나 끊겨 2번까지. 실패는 캐시하지 않고 '불러오지 못함'으로 돌려준다(0명으로 보이지 않게).
    let why='';
    for(let i=0;i<2&&!rows;i++){
      const r=await fetch(`https://apis.data.go.kr/B551982/cso_v2/cso_realtime_v2?${q}`,{signal:AbortSignal.timeout(12000),headers:{accept:'application/json','user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'}}).catch(e=>{why=String(e).slice(0,80);return null;});
      if(!r){continue;}
      const text=await r.text();
      if(!r.ok){why=`http ${r.status}`;continue;}
      let d:{header?:{resultCode?:string;resultMsg?:string};body?:{items?:{item?:Record<string,string>[]|Record<string,string>}}}|null=null;
      try{d=JSON.parse(text);}catch{why=`not json: ${text.slice(0,60)}`;continue;}
      // 관문 오류는 {OpenAPI_ServiceResponse:{cmmMsgHeader:{errMsg,returnReasonCode}}} 모양(10/27: User-Agent 없이 부르면 HTTP_ERROR 04)
      const gw=(d as {OpenAPI_ServiceResponse?:{cmmMsgHeader?:{errMsg?:string;returnReasonCode?:string}}}|null)?.OpenAPI_ServiceResponse?.cmmMsgHeader;
      if(gw){why=`${gw.returnReasonCode??''} ${gw.errMsg??''}`.trim();continue;}
      const code=d?.header?.resultCode;
      if(code&&code!=='00'&&code!=='K0'&&code!=='K3'){why=`${code} ${d?.header?.resultMsg??''}`;continue;}
      const it=d?.body?.items?.item;rows=it?(Array.isArray(it)?it:[it]):[];
    }
    if(!rows)return json({id:p.id,name:p.name,error:why||'upstream'},200,0);
    ctx.waitUntil(caches.default.put(key,new Response(JSON.stringify(rows),{headers:{'cache-control':'max-age=60'}})));
  }
  const mine=rows.filter(x=>x.csoSn===p.cso);
  const tasks=mine.map(x=>({name:x.taskNm,waiting:Number(x.wtngCnt)||0,windows:x.clotCnterNo?String(x.clotCnterNo).split(',').filter(Boolean).length:null}));
  const at=mine[0]?.totDt??null;
  return json({id:p.id,name:p.name,at,total:tasks.reduce((a,t)=>a+t.waiting,0),tasks},200,60);
}

const PRINT_WORD=/프린트|출력|인쇄|복사|제본|카피|copy|print/i;
const PRINT_SKIP=/PC방|피씨방|편의점|GS25|CU|세븐일레븐|이마트24|카페(?!.*프린트)|스터디카페|독서실/i;
type Shop={name:string;addr:string|null;lat:number;lon:number;tel:string|null;cat:string;url:string|null;src:string[]};
/** 내 주변 무인 프린트점·프린트카페: 카카오 키워드(반경 3km) + NAVER API HUB 지역 검색(가까운 동 이름 두 곳). 저장하지 않음. */
async function print(env:Env,lat:number,lon:number){
  const shops=new Map<string,Shop>();
  const add=(s:Shop)=>{const k=flat(s.name);const o=shops.get(k);if(o){o.src=[...new Set([...o.src,...s.src])];o.tel??=s.tel;o.url??=s.url;}else shops.set(k,s);};
  const jobs:Promise<void>[]=[];
  if(env.KAKAO_REST_KEY)for(const q of ['무인프린트','셀프프린트','프린트카페','출력'])jobs.push(fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${new URLSearchParams({query:q,x:String(lon),y:String(lat),radius:'3000',sort:'distance',size:'15'})}`,
    {headers:{Authorization:`KakaoAK ${env.KAKAO_REST_KEY}`},signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json() as Promise<{documents?:Record<string,string>[]}>:null).then(d=>{
      for(const x of d?.documents??[]){const cat=x.category_name??'';if(!PRINT_WORD.test(cat+x.place_name)||PRINT_SKIP.test(x.place_name))continue;
        add({name:x.place_name,addr:x.road_address_name||x.address_name||null,lat:+x.y,lon:+x.x,tel:x.phone||null,cat:cat.split(' > ').pop()??'',url:x.place_url||null,src:['카카오']});}}).catch(()=>{}));
  if(env.NAVER_HUB_CLIENT_ID&&env.NAVER_HUB_CLIENT_SECRET){
    const dongs=near(lat,lon,5,{kinds:['office'],limit:2}).items.map(o=>o.name.replace(/\s*(주민센터|행정복지센터|사무소)$/,''));
    for(const dg of dongs)for(const q of ['무인프린트','셀프 프린트'])jobs.push(fetch(`https://naverapihub.apigw.ntruss.com/search/v1/local?${new URLSearchParams({query:`${dg} ${q}`,display:'5',sort:'random'})}`,
      {headers:{'X-NCP-APIGW-API-KEY-ID':env.NAVER_HUB_CLIENT_ID!,'X-NCP-APIGW-API-KEY':env.NAVER_HUB_CLIENT_SECRET!},signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json() as Promise<{items?:Record<string,string>[]}>:null).then(d=>{
        for(const x of d?.items??[]){const name=(x.title??'').replace(/<[^>]+>/g,'');if(!PRINT_WORD.test((x.category??'')+name)||PRINT_SKIP.test(name))continue;
          let la=Number(x.mapy),lo=Number(x.mapx);if(la>1000){la/=1e7;lo/=1e7;}if(!(la>33&&la<39))continue;
          add({name,addr:x.roadAddress||x.address||null,lat:la,lon:lo,tel:x.telephone||null,cat:(x.category??'').split('>').pop()??'',url:x.link||null,src:['네이버']});}}).catch(()=>{}));
  }
  await Promise.all(jobs);
  const items=[...shops.values()].map(s=>({...s,km:Math.round(distKm(lat,lon,s.lat,s.lon)*100)/100})).filter(s=>s.km<=5).sort((a,b)=>a.km-b.km).slice(0,20);
  return new Response(JSON.stringify({items,sources:{kakao:!!env.KAKAO_REST_KEY,naver:!!env.NAVER_HUB_CLIENT_ID}}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':'*'}});
}

// ---- detail page ----------------------------------------------------------------------------------------------------
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/place/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});
type WR={code:string;name:string;lat:number;lon:number};
const WREG=weatherRegions as WR[];
function connectHtml(p:Place){
  if(p.lat==null||p.lon==null)return '';
  const r=WREG.reduce((x,y)=>distKm(p.lat!,p.lon!,y.lat,y.lon)<distKm(p.lat!,p.lon!,x.lat,x.lon)?y:x);
  const c=r.name.includes(' ')?r.code.slice(0,4)+'0':r.code;
  const items:[string,string,string,string][]=[
    ['🅿️','근처 공영·무료 주차장','세울 곳과 1시간 예상 요금',`https://parking.guidejung.com/region/${c}`],
    ['💊','근처 문 연 약국','서류 떼러 나간 김에',`https://pharmacy.guidejung.com/region/${c}`],
    ['🌤️',`${r.name} 날씨`,'가는 길 비 소식',`https://weather.guidejung.com/region/${r.code}`],
    ['🏫','우리 아이 학교','급식·학사일정',`https://school.guidejung.com/region/${c}`],
  ];
  return `<section class="gj-connect" aria-label="함께 보면 좋은 정보"><h2>🔗 함께 보면 좋은 정보</h2><div>${items.map(([i,t,d,h])=>`<a href="${esc(h)}"><span class="gj-connect-icon" aria-hidden="true">${i}</span><span><b>${esc(t)}</b><small>${esc(d)}</small></span><span class="gj-connect-go" aria-hidden="true">→</span></a>`).join('')}</div></section>`;
}
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const stateHtml=(p:Place)=>{const s=stateOf(p);return `<span class="cv-state ${s.state}">${esc(s.label)}${s.guess?' (보통)':''}</span>`;};
const cardHtml=(c:Near)=>`<div class="cv-card"><a class="cv-card-main" href="${placePath(c.id)}"><span class="cv-kind" aria-hidden="true">${KINDS[c.kind].icon}</span><span class="cv-card-body"><b>${esc(c.name)}</b><small><span class="cv-km">${esc(km(c.km))}</span>${stateHtml(c)}</small><small class="muted">${esc(c.addr??c.jibun??'')}</small></span></a><span class="cv-acts">${c.tel?`<a href="${esc(telHref(c.tel))}" aria-label="전화">📞</a>`:''}<a href="${esc(mapUrl(c))}" target="_blank" rel="noopener" aria-label="길찾기">🧭</a></span></div>`;
// 실시간 대기(민원실 상세): 인라인 스크립트가 /api/wait를 불러 채움(Next 스크립트 없음).
const WAIT_JS=(id:string)=>`<script>(function(){var e=document.getElementById('cv-wait');fetch('/api/wait?id=${id}').then(function(r){return r.json()}).then(function(d){if(d.error){e.innerHTML='<p class="muted">지금은 대기 현황을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>';return}if(!d.tasks||!d.tasks.length){e.innerHTML='<p class="muted">지금은 대기 현황이 없어요(업무 시간 외이거나 점검 중).</p>';return}var t=d.at?String(d.at).replace(/^(\\d{4})(\\d{2})(\\d{2})(\\d{2})(\\d{2}).*/,'$4:$5'):'';e.innerHTML='<p class="cv-answer">지금 대기 <b>'+d.total+'명</b>'+(t?' <span class="muted">('+t+' 기준)</span>':'')+'</p><ul class="cv-wait">'+d.tasks.map(function(x){return '<li><span>'+x.name.replace(/[<>&]/g,'')+'</span><b>'+x.waiting+'명</b></li>'}).join('')+'</ul>'}).catch(function(){e.innerHTML='<p class="muted">대기 현황을 불러오지 못했어요.</p>'})})();</script>`;

function detailHtml(p:Place,groups:[string,Near[]][]){
  const addr=p.addr??p.jibun,K=KINDS[p.kind],D=data().docs;
  const docs=(p.docs??[]).map(i=>D[i]).filter(Boolean);
  const byMenu=Object.entries(docs.reduce((a,[name,m])=>((a[m||'기타']??=[]).push(name),a),{} as Record<string,string[]>)).sort((a,b)=>b[1].length-a[1].length);
  const hours=hoursLine(p);
  const faq:[string,string][]=([
    [`${eun(p.name)} 어디에 있나요?`,addr?`${addr}${p.spot?` ${p.spot}`:''}에 있습니다${p.tel?`(전화 ${p.tel})`:''}.`:''],
    [`${p.name} 운영 시간은?`,`${hours}입니다.${p.kind==='office'?' 주민센터 운영 시간은 공공데이터에 없어 일반 기준을 적었습니다. 방문 전 확인하세요.':''}`],
    ...(p.kind==='kiosk'?[[`${p.name}에서 어떤 서류를 뗄 수 있나요?`,docs.length?`${n2(docs.length)}종을 뗄 수 있습니다(${byMenu.slice(0,4).map(([m,l])=>`${m} ${l.length}종`).join(', ')}). ${p.reg?'등기사항증명서도 뗄 수 있습니다.':''}`:'서류 목록을 아직 받지 못했습니다.'] as [string,string]]:[]),
  ] as [string,string][]).filter(([,x])=>x);
  const [sido,...rest]=p.region_name.split(' ');
  const ld={'@context':'https://schema.org','@type':K.ld,name:p.name,url:SITE+placePath(p.id),image:SITE+'/og.png',
    ...(addr?{address:{'@type':'PostalAddress',streetAddress:addr,addressLocality:rest.join(' ')||sido,addressRegion:sido,addressCountry:'KR',...(p.zip?{postalCode:p.zip}:{})}}:{}),
    ...(p.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:p.lat,longitude:p.lon}}:{}),...(p.tel?{telephone:p.tel}:{}),
    ...(p.kind==='kiosk'&&p.wk?{openingHoursSpecification:[{'@type':'OpeningHoursSpecification',dayOfWeek:['Monday','Tuesday','Wednesday','Thursday','Friday'],opens:p.wk[0],closes:p.wk[1]},...(p.hol?[{'@type':'OpeningHoursSpecification',dayOfWeek:['Saturday','Sunday'],opens:p.hol[0],closes:p.hol[1]}]:[])]}:{})};
  const crumbs={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[['내근처 서류',SITE+'/'],['지역별',SITE+'/region'],[p.region_name,`${SITE}/region/${p.region}`],[p.name,SITE+placePath(p.id)]].map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))};
  const faqLd={'@context':'https://schema.org','@type':'FAQPage',mainEntity:faq.map(([q,x])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:x}}))};
  const ldTag=(d:unknown)=>`<script type="application/ld+json">${JSON.stringify(d).replace(/</g,'\\u003c')}</script>`;
  const facts:[string,string|null|undefined][]=[['구분',K.title],['운영 시간',hours],['도로명 주소',p.addr],['설치 위치',p.spot],['설치 장소',p.at],['관리 기관',p.org],['전화',p.tel],['우편번호',p.zip],
    ['장애인 편의',p.a11y?.length?p.a11y.join(' · '):null],['참고',p.note],['지역',p.region_name]];
  return `<nav class="crumbs"><a href="/">홈</a> › <a href="/region">지역별</a> › <a href="/region/${esc(p.region)}">${esc(p.region_name)}</a> › ${esc(p.name)}</nav>
<div class="cv-head"><h1>${K.icon} ${esc(p.name)}</h1><p>${esc([p.region_name,K.title].join(' · '))}</p></div>${actionsHtml({id:p.id,name:p.name,sub:[K.label,p.region_name].join(' · '),url:placePath(p.id)})}
<p class="cv-answer">${stateHtml(p)} <b>${esc(hours)}</b>${addr?` <span class="muted">· ${esc(addr)}${p.spot?` (${esc(p.spot)})`:''}</span>`:''}</p>
<div class="cv-actions">${p.tel?`<a href="${esc(telHref(p.tel))}">📞 전화하기</a>`:''}<a class="${p.tel?'sub':''}" href="${esc(mapUrl(p))}" rel="noopener" target="_blank">🧭 길찾기</a><a class="naver" href="${esc(naverUrl(p))}" rel="noopener" target="_blank">🟢 네이버 지도에서 보기</a>${p.url?`<a class="sub" href="${esc(p.url)}" rel="noopener" target="_blank">🏛️ 안내 누리집</a>`:''}</div>
${p.kind==='cso'?`<section><h2>⏱️ 지금 대기 현황</h2><div id="cv-wait"><p class="muted">불러오는 중…</p></div></section>${WAIT_JS(p.id)}`:''}
${p.kind==='kiosk'?`<section><h2>🧾 뗄 수 있는 서류 ${docs.length?`${n2(docs.length)}종`:''}</h2>${p.reg||p.fam?`<p>${[p.reg&&'✅ 등기사항증명서(부동산 등기부)',p.fam&&'✅ 가족관계증명서'].filter(Boolean).join(' · ')}</p>`:''}${byMenu.length?byMenu.map(([m,l])=>`<details${byMenu.length<4?' open':''}><summary><b>${esc(m)}</b> <span class="muted">${l.length}종</span></summary><ul class="cv-plain">${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`).join(''):'<p class="muted">서류 목록을 아직 받지 못했어요.</p>'}<p class="cv-note">수수료는 서류·지자체마다 달라요. 주민등록등본 등 많은 서류는 정부24에서 온라인으로도 뗄 수 있어요.</p></section>`:''}
${groups.map(([title,list])=>list.length?`<section><h2>${esc(title)}</h2><div class="cv-cards">${list.map(cardHtml).join('')}</div></section>`:'').join('')}
<p><a class="cv-more-link" href="/region/${esc(p.region)}">${esc(p.region_name)} 민원·서류 모두 보기 →</a></p>
${p.lat!=null&&p.lon!=null?aroundHtml(p.lat,p.lon,'☕ 서류 떼고 걸어서 갈 곳','CE7,CS2,BK9,FD6'):''}
<section><h2>정보</h2><dl class="cv-facts">${facts.filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${connectHtml(p)}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: ${esc(K.src)}. 정보가 다르면 관할 기관에 정정을 요청해 주세요.</p>
${ldTag(ld)}${ldTag(crumbs)}${ldTag(faqLd)}`;
}
const n2=(v:number)=>v.toLocaleString('ko-KR');

async function detail(p:Place,url:URL,env:Env,ctx:ExecutionContext){
  // 운영 중 표시가 바뀌므로 10분 단위로 다시 만듦
  const key=new Request(`${url.origin}/place/${p.id}?v=${encodeURIComponent(data().status.updated_at)}&a=${ADS?1:0}&t=${Math.floor(Date.now()/600e3)}`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const at=(k:Kind,r:number,lim:number)=>p.lat!=null?near(p.lat,p.lon!,r,{limit:lim,kinds:[k],skip:p.id}).items:[];
  const K=KINDS[p.kind];
  const groups:[string,Near[]][]=[[p.kind==='kiosk'?'근처 다른 무인민원발급기':`근처 다른 ${K.label}`,at(p.kind,p.kind==='passport'||p.kind==='cso'?20:3,6)],
    ...(['kiosk','office','post'] as Kind[]).filter(k=>k!==p.kind).map(k=>[`근처 ${KINDS[k].label}`,at(k,3,3)] as [string,Near[]])];
  const title=`${p.name} ${p.kind==='kiosk'?'무인민원발급기 운영 시간·서류':`${K.label} 위치·운영 시간`} | 내근처 서류`;
  const desc=`${p.region_name} ${p.name}(${K.title}): ${hoursLine(p)} · ${p.addr??p.jibun??''}${p.kind==='kiosk'&&p.docs?.length?` · 서류 ${n2(p.docs.length)}종`:''}`.replace(/\s+/g,' ').trim().slice(0,160);
  const canonical=SITE+placePath(p.id);
  let html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<link rel="canonical" href="${canonical}"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:url" content="${canonical}"/><meta property="og:image" content="${SITE}/og.png"/><meta property="og:site_name" content="내근처 서류"/><meta property="og:locale" content="ko_KR"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="place-detail">PLACE_DETAIL<\/div>/,detailHtml(p,groups));
  if(ADS)html=html.replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
function sitemap(path:string){
  if(path==='/sitemap.xml')return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap><sitemap><loc>${SITE}/sitemap-places-1.xml</loc></sitemap></sitemapindex>`);
  if(path!=='/sitemap-places-1.xml')return null;
  return xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${data().items.map(p=>`<url><loc>${SITE}${placePath(p.id)}</loc></url>`).join('')}</urlset>`);
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/fav'){const ids=[...new Set((p.get('ids')??'').split(','))].filter(x=>/^[0-9A-Za-z-]{2,40}$/.test(x)).slice(0,20);
        return json({items:ids.map(get).filter((x):x is Place=>!!x).map(x=>{const s=stateOf(x);return {id:x.id,state:s.state,label:s.label,line:[KINDS[x.kind].label,x.region_name].join(' · ')};})},200,300);}
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const kinds=(p.get('kind')??'').split(',').filter(k=>k in KINDS) as Kind[];
        const per=num(p.get('per'));const doc=p.get('doc');
        const r=near(lat,lon,Math.max(.2,Math.min(50,num(p.get('km'))??2)),{limit:Math.max(1,Math.min(600,num(p.get('limit'))??100)),per:per?Math.max(1,Math.min(200,per)):undefined,
          kinds:kinds.length?kinds:null,doc:doc?docSet(doc)??null:null,openOnly:p.get('open')==='1'});
        return json({total:r.total,counts:r.counts,open:r.open,items:r.items.map(x=>({...slim(x),km:x.km}))},200,120);}
      if(url.pathname==='/api/wait'){const x=get(p.get('id')??'');if(!x||x.kind!=='cso')return json({error:'unknown'},404,600);return await wait(env,x,ctx);}
      if(url.pathname==='/api/print'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null||lat<33||lat>39)return json({error:'lat/lon'},400,0);return await print(env,lat,lon);}
      if(url.pathname==='/api/search'){const q=flat(p.get('q')??'').slice(0,30);if(!q)return json({total:0,items:[]});
        const words=(p.get('q')??'').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4).map(flat);
        const hit=data().items.filter(x=>{const name=flat(x.name),where=flat(x.region_name+(x.addr??'')+(x.spot??'')+KINDS[x.kind].title);return words.every(w=>name.includes(w)||where.includes(w));});
        const score=(x:Place)=>{const name=flat(x.name);return name.startsWith(q)?0:name.includes(q)?1:2+words.filter(w=>!name.includes(w)).length;};
        hit.sort((a,b)=>score(a)-score(b)||KIND_ORDER.indexOf(a.kind)-KIND_ORDER.indexOf(b.kind)||a.name.localeCompare(b.name));
        return json({total:hit.length,items:hit.slice(0,40).map(slim)},200,600);}
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:data().status,ads:ADS,keys:{data:!!env.DATA_GO_KR_KEY,kakao:!!env.KAKAO_REST_KEY,naver:!!env.NAVER_HUB_CLIENT_ID}},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      if(url.pathname==='/sitemap.xml'||url.pathname.startsWith('/sitemap-places-')){const s=sitemap(url.pathname);if(s)return s;}
      const m=url.pathname.match(/^\/place\/([a-z][0-9A-Za-z-]{2,40})\/?$/);
      if(m&&m[1]!=='shell'){const x=get(m[1]);if(x)return await detail(x,url,env,ctx);}
      if(m||url.pathname==='/place/shell.html'||url.pathname.startsWith('/sitemap-places-')){const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});}
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
