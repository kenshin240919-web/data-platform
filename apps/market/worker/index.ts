// Cloudflare Worker for market.guidejung.com (내근처 시장 — 온누리상품권 사용처). Static pages: ./out (Next.js export).
// The list ships with the Worker (data/market.json, scripts/collect-market.py — 소상공인시장진흥공단 온누리상품권 가맹점 현황;
// no database), imported as text (wrangler.jsonc rules) and parsed on first use.
// Routes: /api/near (내 주변 시장·가맹점), /api/search, /api/place (가게 위치 — 카카오 키워드 검색을 방문 때마다, 저장 안 함),
// /api/where, /api/status, 가게 상세 /store/{id} (server-rendered into /store/shell, noindex — 원본에 가게 주소가 없어 내용이 얇음),
// /sitemap.xml (index → /sitemap-pages.xml from Next).
import raw from '../data/market.json';
import {CATS,distKm,esc,eun,located,mapUrl,marketPath,n,pct,SITE,slimMarket,storePath,type Cat,type Data,type Market,type StoreRow} from '../lib/fmt';
import {actionsHtml} from '../../../packages/ui/src/actions';

interface Env{ASSETS:Fetcher;KAKAO_REST_KEY?:string}
let parsed:Data|null=null,byId:Map<string,StoreRow>|null=null,byMarket:Map<number,StoreRow[]>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const store=(id:string)=>(byId??=new Map(data().stores.map(s=>[s[0],s]))).get(id);
const storesOf=(i:number)=>(byMarket??=(()=>{const m=new Map<number,StoreRow[]>();for(const s of data().stores)(m.get(s[2])??m.set(s[2],[]).get(s[2])!).push(s);return m;})()).get(i)??[];
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':maxAge?`public, max-age=${maxAge}`:'private, no-store','access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/[\s·.,()\-]/g,'').toLowerCase();
const slimStore=(s:StoreRow,m:Market,km?:number)=>({id:s[0],name:s[1],cat:s[3],item:s[4],d:s[5],market:m.name,mid:m.id,lat:located(m)?m.lat:null,lon:located(m)?m.lon:null,...(km!=null?{km}:{})});

/** 반경 안 시장(위치가 있는 곳: 표준데이터·카카오·동 중심)을 가까운 순으로(최대 mlimit, 휴대폰이 정확한 위치로 다시 자를 수 있게 시장별 품목 수 cats도). cat이 있으면 그 품목 가게가 있는 시장만, 가게 목록도. */
function near(lat:number,lon:number,radius:number,cat:Cat|null,limit:number,mlimit:number){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180));
  const ms:{m:Market;i:number;km:number;hit:number}[]=[];const cats:Partial<Record<Cat,number>>={};let total=0;
  data().markets.forEach((m,i)=>{
    if(!located(m)||Math.abs(m.lat!-lat)>dLat||Math.abs(m.lon!-lon)>dLon)return;
    const d=distKm(lat,lon,m.lat!,m.lon!);if(d>radius)return;
    const hit=cat?m.cats[cat]??0:m.n;if(!hit)return;
    for(const [c,v] of Object.entries(m.cats) as [Cat,number][])cats[c]=(cats[c]??0)+v;
    total+=hit;ms.push({m,i,km:Math.round(d*100)/100,hit});
  });
  ms.sort((a,b)=>a.km-b.km);
  const stores=cat?ms.flatMap(x=>storesOf(x.i).filter(s=>s[3]===cat).map(s=>slimStore(s,x.m,x.km))).slice(0,limit):[];
  return {km:radius,total,cats,markets:ms.slice(0,mlimit).map(x=>({...slimMarket(x.m),km:x.km,hit:x.hit,cats:x.m.cats})),stores};
}

function search(q:string){
  const words=q.trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4).map(flat).filter(Boolean);if(!words.length)return {total:0,markets:[],stores:[]};
  const D=data();
  const mk=D.markets.filter(m=>words.every(w=>flat(m.name+(m.region_name??'')+m.sido).includes(w))).sort((a,b)=>b.n-a.n).slice(0,12).map(slimMarket);
  const hit:StoreRow[]=[];
  for(const s of D.stores){const m=D.markets[s[2]];const name=flat(s[1]),where=flat(m.name+(m.region_name??'')+m.sido+(s[4]??'')+CATS[s[3]].label);
    if(words.every(w=>name.includes(w)||where.includes(w)))hit.push(s);}
  const q0=words.join('');const score=(s:StoreRow)=>{const nm=flat(s[1]);return nm===q0?0:nm.startsWith(q0)?1:nm.includes(q0)?2:3;};
  hit.sort((a,b)=>score(a)-score(b)||D.markets[b[2]].n-D.markets[a[2]].n);
  return {total:hit.length,markets:mk,stores:hit.slice(0,60).map(s=>slimStore(s,D.markets[s[2]]))};
}

/** 가게 위치: 카카오 키워드 검색(가게 이름, 시장 좌표 기준 1.5km 안, 가까운 순) — 이름이 맞는 첫 곳. 방문 때마다, 저장하지 않음(카카오 약관). */
async function place(env:Env,s:StoreRow){
  const m=data().markets[s[2]];
  if(!env.KAKAO_REST_KEY)return {found:false,off:true};
  const loc=located(m);
  const q=new URLSearchParams({query:loc?s[1]:`${m.name} ${s[1]}`,size:'10',...(loc?{x:String(m.lon),y:String(m.lat),radius:m.geo==='dong'?'3000':'1500',sort:'distance'}:{})});
  const r=await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${q}`,{headers:{Authorization:`KakaoAK ${env.KAKAO_REST_KEY}`},signal:AbortSignal.timeout(6000)});
  if(!r.ok)return {found:false,error:r.status};
  const d=await r.json() as {documents?:Record<string,string>[]};
  const want=flat(s[1]);
  const doc=(d.documents??[]).find(x=>{const pn=flat(x.place_name??'');return pn&&(pn.includes(want)||(pn.length>=2&&want.includes(pn)));});
  if(!doc)return {found:false};
  return {found:true,name:doc.place_name,addr:doc.road_address_name||doc.address_name||null,tel:doc.phone||null,lat:+doc.y,lon:+doc.x,cat:(doc.category_name??'').split(' > ').slice(-1)[0]||null,
    url:doc.place_url?String(doc.place_url).replace(/^http:/,'https:'):null,m:loc?Math.round(distKm(m.lat!,m.lon!,+doc.y,+doc.x)*1000):null};
}

// ---- store detail page ----------------------------------------------------------------------------------------------
let shell:Promise<string>|null=null;
const template=(env:Env,origin:string)=>shell??=env.ASSETS.fetch(new Request(origin+'/store/shell')).then(r=>{if(!r.ok)throw new Error('shell');return r.text();})
  .then(h=>h.replace(/<script[^>]*src="\/_next\/[^"]*"[^>]*><\/script>/g,'').replace(/<script>self\.__next_f[\s\S]*?<\/script>/g,'').replace(/<link rel="preload"[^>]*as="script"[^>]*\/?>/g,''))
  .catch(e=>{shell=null;throw e;});
const AD_FILL='<script>try{document.querySelectorAll("ins.adsbygoogle").forEach(function(){(window.adsbygoogle=window.adsbygoogle||[]).push({})})}catch(e){}</script>';
const row=(s:StoreRow)=>`<li><a href="${storePath(s[0])}"><b>${esc(s[1])}</b><small>${CATS[s[3]].icon} ${esc(s[4]??CATS[s[3]].label)}${s[5]?'':' · 지류만'}</small></a></li>`;
// 가게 위치는 보이기 시작할 때 /api/place로(카카오 — 저장 안 함). 찾으면 주소·전화·🧭 길찾기, 못 찾으면 시장 길찾기.
const PLACE_JS=`<script>(function(){var b=document.getElementById('mk-place');if(!b)return;var e=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
fetch('/api/place?id='+b.getAttribute('data-id')).then(function(r){return r.json()}).then(function(d){if(!d.found){b.innerHTML='<p>지도에서 이 가게를 찾지 못했어요. 소속 시장으로 길찾기를 하거나 시장에서 물어보세요.</p>';return;}
var to='https://map.kakao.com/link/to/'+encodeURIComponent(d.name)+','+d.lat+','+d.lon;
b.innerHTML='<p>📍 <b>'+e(d.name)+'</b>'+(d.cat?' · '+e(d.cat):'')+(d.m!=null?' · 시장에서 약 '+(d.m<1000?d.m+'m':(d.m/1000).toFixed(1)+'km'):'')+'<br>'+e(d.addr||'')+'</p><div class="mk-actions"><a href="'+to+'" target="_blank" rel="noopener">🧭 가게 길찾기</a>'+(d.tel?'<a class="sub" href="tel:'+e(d.tel.replace(/[^0-9]/g,''))+'">📞 '+e(d.tel)+'</a>':'')+(d.url?'<a class="sub" href="'+e(d.url)+'" target="_blank" rel="noopener">카카오맵에서 보기</a>':'')+'</div><p class="muted small">카카오 지도에서 이름으로 찾은 위치예요. 같은 이름의 다른 가게일 수 있어요.</p>';
}).catch(function(){b.innerHTML='<p>위치를 불러오지 못했어요. 소속 시장으로 길찾기를 해 주세요.</p>'})})();</script>`;
function detailHtml(s:StoreRow,m:Market){
  const C=CATS[s[3]],all=storesOf(data().markets.indexOf(m)),same=all.filter(x=>x[3]===s[3]&&x[0]!==s[0]).slice(0,12),other=all.filter(x=>x[3]!==s[3]).slice(0,9);
  const where=m.region_name??m.sido,loc=located(m);
  const nearM=loc?data().markets.filter(x=>x!==m&&located(x)&&Math.abs(x.lat!-m.lat!)<.05&&Math.abs(x.lon!-m.lon!)<.06).map(x=>({x,km:distKm(m.lat!,m.lon!,x.lat!,x.lon!)})).filter(o=>o.km<=3).sort((a,b)=>a.km-b.km).slice(0,4):[];
  const faq:[string,string][]=[
    [`${s[1]}에서 온누리상품권을 쓸 수 있나요?`,`네. ${eun(s[1])} ${m.name}의 온누리상품권 가맹점이에요(소상공인시장진흥공단 가맹점 목록${data().status.base?`, ${data().status.base} 기준`:''}). 지류형(종이)을 받고, 디지털형(모바일·카드)은 ${s[5]?'함께 받아요':'가맹하지 않았어요'}.`],
    [`${eun(s[1])} 어디에 있나요?`,`${where} ${m.name} 안에 있어요.${m.addr?` 시장 주소는 ${m.addr}이에요.`:''}`],
  ];
  return `<nav class="crumbs"><a href="/">홈</a> › ${m.region?`<a href="/region/${esc(m.region)}">${esc(where)}</a> › `:''}<a href="${marketPath(m.id)}">${esc(m.name)}</a> › ${esc(s[1])}</nav>
<div class="mk-head"><h1>${C.icon} ${esc(s[1])}</h1><p>${esc([m.name,where,s[4]??C.label].join(' · '))}</p></div>${actionsHtml({id:s[0],name:s[1],sub:`${m.name} · 온누리 가맹점`,url:storePath(s[0])})}
<p class="mk-answer">✅ <b>온누리상품권 가맹점</b> · 지류형 ✔ · 디지털형(모바일·카드) ${s[5]?'✔':'✘'}${s[6]?` <span class="muted">· ${s[6]}년 가맹</span>`:''}</p>
<section class="mk-place" id="mk-place" data-id="${esc(s[0])}"><p class="muted">지도에서 가게 위치를 찾는 중…</p></section>
<div class="mk-actions">${loc||m.addr?`<a class="sub" href="${esc(mapUrl({name:m.name,lat:loc?m.lat:null,lon:loc?m.lon:null,addr:m.addr??m.jibun}))}" target="_blank" rel="noopener">🧭 ${esc(m.name)} 길찾기</a>`:''}<a class="naver" href="https://map.naver.com/p/search/${encodeURIComponent(`${s[1]} ${m.name}`)}" target="_blank" rel="noopener">🟢 네이버 지도에서 보기</a><a class="sub" href="${marketPath(m.id)}">🏪 ${esc(m.name)} 가맹점 ${n(m.n)}곳</a></div>
<section><h2>정보</h2><dl class="mk-facts">${([['가게 이름',s[1]],['취급 품목',s[4]],['분류',C.label],['소속 시장·상점가',m.name],['지역',where],['시장 주소',m.addr??m.jibun],['지류형(종이)','가맹'],['디지털형(모바일·카드)',s[5]?'가맹':'가맹 안 함'],['가맹 등록',s[6]?`${s[6]}년`:null]] as [string,string|null|undefined][]).filter(([,v])=>v).map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>
${same.length?`<section><h2>${esc(m.name)}의 다른 ${esc(C.label)} 가맹점</h2><ul class="mk-stores">${same.map(row).join('')}</ul></section>`:''}
${other.length?`<section><h2>${esc(m.name)}의 다른 가맹점</h2><ul class="mk-stores">${other.map(row).join('')}</ul><p><a class="mk-more-link" href="${marketPath(m.id)}">${esc(m.name)} 가맹점 ${n(m.n)}곳 모두 보기 →</a></p></section>`:''}
${nearM.length?`<section><h2>가까운 다른 시장·상점가</h2><div class="mk-cards">${nearM.map(({x,km})=>`<a class="mk-card" href="${marketPath(x.id)}"><span class="mk-icon" aria-hidden="true">🏪</span><span class="mk-card-body"><b>${esc(x.name)}</b><small><span class="mk-km">${km<1?Math.round(km*1000)+'m':km.toFixed(1)+'km'}</span>디지털 ${pct(x.d,x.n)}%</small></span><span class="mk-card-n"><b>${n(x.n)}</b><small>가맹점</small></span></a>`).join('')}</div></section>`:''}
<section class="gj-faq" aria-label="자주 묻는 질문"><h2>자주 묻는 질문</h2><dl>${faq.map(([q,x])=>`<div><dt>${esc(q)}</dt><dd>${esc(x)}</dd></div>`).join('')}</dl></section>
<p class="muted small">출처: 소상공인시장진흥공단 「전국 온누리상품권 가맹점 현황」. 가맹 여부는 바뀔 수 있으니 결제 전에 가게에 확인하세요. 가게 위치는 카카오 지도 검색 결과이며 저장하지 않아요.</p>
${PLACE_JS}`;
}
async function detail(s:StoreRow,url:URL,env:Env,ctx:ExecutionContext){
  const key=new Request(`${url.origin}/store/${s[0]}?v=${encodeURIComponent(data().status.updated_at)}&t=1`);
  const hit=await caches.default.match(key);if(hit)return hit;
  const m=data().markets[s[2]];
  const title=`${s[1]} 온누리상품권 가맹점 · ${m.name} | 내근처 시장`;
  const desc=`${m.region_name??m.sido} ${m.name} ${s[1]}(${s[4]??CATS[s[3]].label}) — 온누리상품권 지류형${s[5]?'·디지털형':''} 가맹점. 가게 위치와 길찾기, 같은 시장의 다른 가맹점.`.slice(0,160);
  const html=(await template(env,url.origin))
    .replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\/?>/,`<meta name="description" content="${esc(desc)}"/>`)
    .replace(/<link rel="canonical" href="[^"]*"\/?>/,'')
    .replace(/<meta name="robots" content="[^"]*"\/?>/g,'')
    .replace(/<meta property="og:[^"]*" content="[^"]*"\/?>/g,'').replace(/<meta name="twitter:[^"]*" content="[^"]*"\/?>/g,'')
    .replace('</head>',`<meta name="robots" content="noindex, follow"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(desc)}"/><meta property="og:image" content="${SITE}/og.png?v=2"/><meta property="og:site_name" content="내근처 시장"/><meta name="twitter:card" content="summary_large_image"/></head>`)
    .replace(/<div id="store-detail">STORE_DETAIL<\/div>/,`<div id="store-detail">${detailHtml(s,m)}</div>`)
    .replace('</body>',AD_FILL+'</body>');
  const res=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=3600'}});
  ctx.waitUntil(caches.default.put(key,res.clone()));
  return res;
}

const xml=(body:string)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':'public, max-age=3600'}});
const notFound=async(env:Env,url:URL)=>{const nf=await env.ASSETS.fetch(new Request(url.origin+'/404'));return new Response(nf.body,{status:404,headers:nf.headers});};

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const c=p.get('cat');const cat=c&&c in CATS?c as Cat:null;
        return json(near(lat,lon,Math.max(.3,Math.min(50,num(p.get('km'))??2)),cat,Math.max(1,Math.min(600,num(p.get('limit'))??300)),Math.max(1,Math.min(200,num(p.get('mlimit'))??60))),200,600);}
      if(url.pathname==='/api/search'){const q=(p.get('q')??'').slice(0,40);return json(search(q),200,600);}
      if(url.pathname==='/api/place'){const s=store(p.get('id')??'');if(!s)return json({found:false},404,0);
        try{return json(await place(env,s),200,0);}catch{return json({found:false,error:'upstream'},200,0);}}
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:data().status,place:!!env.KAKAO_REST_KEY},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
      if(url.pathname==='/sitemap.xml')return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-pages.xml</loc></sitemap></sitemapindex>`);
      const m=url.pathname.match(/^\/store\/([0-9a-f]{10})\/?$/);
      if(m){const s=store(m[1]);if(s)return await detail(s,url,env,ctx);}
      if(m||url.pathname.startsWith('/store/'))return await notFound(env,url);
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
