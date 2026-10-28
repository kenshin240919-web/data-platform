// 카카오·네이버로 하는 화면 기능 — 모든 페이지 맨 위 NetworkBar에 들어 있는 LIVE_JS 하나가 맡는다
// (Worker 상세는 하이드레이션이 없어서 정적 페이지와 같은 방식). 정적 페이지는 React로, Worker는 *Html 문자열로 같은 자리표시를 넣는다.
//  ① 📝 네이버 블로그 후기  <section class="gj-blog" data-q data-must>  — 보이기 직전에 near.guidejung.com/api/blog
//  ② ☕ 걸어서 갈 곳        <section class="gj-around" data-lat data-lon data-cats data-r> — 보이기 직전에 /api/around(카카오 카테고리)
//  ③ 🧭 길안내 앱 고르기    map.kakao.com/link/to/… 링크를 누르면(휴대폰) 카카오맵·카카오내비·네이버지도·T맵 중 고르기
//  ④ 🗺️ 지도로 보기        (표시를 누르면 상세가 있는 곳은 '자세히 보기'만 — 길찾기는 상세에서) 한 페이지에 좌표 있는 곳이 2곳 넘으면 카카오맵으로(누를 때만 지도를 불러옴) — KAKAO_APPS map 앱 사이트만
//  ⑤ 💬 카카오톡 공유      .gj-kakao 버튼(늘 넣고, 키 없는 사이트는 html.gj-nokakao로 숨김)
// 카카오·네이버 결과는 저장하지 않는다(브라우저에서 보여 주기만). 방문자 위치는 이 기능들로 서버에 보내지 않는다(장소 좌표만).

/** 카카오 JavaScript 키(브라우저용 공개 키 — 키마다 등록한 'JS SDK 도메인'에서만 동작, 키 하나에 도메인 10개까지).
 * 둘 다 카카오 앱 '내근처학원'(카카오맵 무료 쿼터 앱)의 키라 지도도 모두 무료 쿼터 안(10/27 사용자 등록).
 * 목록에 없거나 키가 빈 사이트는 ④·⑤·카카오내비를 숨김(길안내 고르기는 카카오맵·네이버·T맵으로 동작). 새 사이트는 키에 도메인을 추가하고 여기에도. */
export const KAKAO_APPS:{key:string;map:boolean;hosts:string[]}[]=[
  {key:'88ef8988f1ee3212281e2ea85a80c54d',map:true,hosts:['trip','pharmacy','hospital','oil','parking','charge','pet','rest','service','minwon']}, // 키 이름 '가이드정'
  {key:'0972914c99ee9b4b415844e8c2ad7537',map:true,hosts:['weather','traffic','academy','school','near','market','benefit']}, // 키 이름 '내근처 공유'
];
const KAKAO_BY_HOST=Object.fromEntries(KAKAO_APPS.flatMap(a=>a.key?a.hosts.map(h=>[h,[a.key,a.map?1:0]]):[]));
export const NEAR_API='https://near.guidejung.com';
const attr=(s:unknown)=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));

/** 네이버 블로그 후기 자리. q: 검색어(이름 + 지역), must: 글에 꼭 들어가야 할 이름. */
export const blogHtml=(q:string,must:string,title='📝 네이버 블로그 후기',cafe=false)=>
  `<section class="gj-blog" data-q="${attr(q)}" data-must="${attr(must)}"${cafe?' data-src="cafe"':''} aria-label="${cafe?'카페 이야기':'블로그 후기'}"><h2>${attr(title)}</h2><div class="gj-live-body"><p class="gj-live-wait">후기를 찾는 중…</p></div></section>`;
/** 걸어서 갈 곳 자리. cats: 카카오 카테고리 코드(CE7 카페·CS2 편의점·FD6 음식점…), r: 반경 m. */
export const aroundHtml=(lat:number,lon:number,title='☕ 기다리는 동안 걸어서 갈 곳',cats='CE7,CS2,FD6',r=500)=>
  `<section class="gj-around" data-lat="${lat}" data-lon="${lon}" data-cats="${attr(cats)}" data-r="${r}" aria-label="걸어서 갈 곳"><h2>${attr(title)}</h2><div class="gj-around-tabs"></div><div class="gj-live-body"><p class="gj-live-wait">주변을 찾는 중…</p></div></section>`;

export const LIVE_JS=`(function(){if(window.__gjLive)return;window.__gjLive=1;
var API='${NEAR_API}',KA=${JSON.stringify(KAKAO_BY_HOST)}[location.hostname.split('.')[0]]||['',0],KEY=KA[0],MAP=KA[1],CN={CE7:'☕ 카페',CS2:'🏪 편의점',FD6:'🍚 식당',PM9:'💊 약국',BK9:'🏦 은행',MT1:'🛒 마트',PK6:'🅿️ 주차장'};
function e(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function ga(n,p){try{window.gtag&&window.gtag('event',n,p)}catch(x){}}
function get(p){return fetch(API+p).then(function(r){return r.ok?r.json():null}).catch(function(){return null})}
function dist(m){return m==null?'':m<1000?m+'m':(m/1000).toFixed(1)+'km'}
var mob=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
/* ① 블로그 후기 */
function blog(s){var q=s.getAttribute('data-q'),b=s.querySelector('.gj-live-body');
var cafe=s.getAttribute('data-src')==='cafe';get('/api/blog?q='+encodeURIComponent(q)+'&must='+encodeURIComponent(s.getAttribute('data-must')||'')+(cafe?'&src=cafe':'')).then(function(d){
if(!d||!d.items||!d.items.length){s.remove();return}
b.innerHTML='<ul class="gj-blog-list">'+d.items.map(function(x){return '<li><a href="'+e(x.url)+'" target="_blank" rel="noopener nofollow"><b>'+e(x.title)+'</b><span>'+e(x.desc)+'</span><small>'+e(x.by)+(x.date?' · '+e(x.date):'')+'</small></a></li>'}).join('')+'</ul>'
+'<p class="gj-live-note">네이버 '+(cafe?'카페':'블로그')+' 검색 결과예요 · '+(cafe?'회원만 볼 수 있는 글도 있어요':'광고·협찬 글이 섞여 있을 수 있어요')+' · <a href="https://search.naver.com/search.naver?ssc=tab.'+(cafe?'cafe':'blog')+'.all&query='+encodeURIComponent(q)+'" target="_blank" rel="noopener nofollow">더 보기 ↗</a></p>';
b.addEventListener('click',function(ev){var a=ev.target.closest&&ev.target.closest('a');if(a)ga('blog_click',{item_id:location.pathname,src:cafe?'cafe':'blog'})})})}
/* ② 걸어서 갈 곳 */
function around(s){if(!s.querySelector('.gj-live-body'))s.insertAdjacentHTML('beforeend','<div class="gj-around-tabs"></div><div class="gj-live-body"></div>');var cats=(s.getAttribute('data-cats')||'CE7,CS2,FD6').split(','),tabs=s.querySelector('.gj-around-tabs'),b=s.querySelector('.gj-live-body'),seen={};
function show(c){if(tabs)tabs.querySelectorAll('button').forEach(function(t){t.toggleAttribute('data-on',t.getAttribute('data-c')===c)});
b.innerHTML='<p class="gj-live-wait">주변을 찾는 중…</p>';
var go=seen[c]||(seen[c]=get('/api/around?lat='+s.getAttribute('data-lat')+'&lon='+s.getAttribute('data-lon')+'&cat='+c+'&r='+(s.getAttribute('data-r')||500)));
go.then(function(d){if(!d||!d.items){b.innerHTML='<p class="gj-live-wait">지금은 불러오지 못했어요.</p>';return}
if(!d.items.length){b.innerHTML='<p class="gj-live-wait">'+(s.getAttribute('data-r')||500)+'m 안에서 찾지 못했어요.</p>';return}
b.innerHTML='<ul class="gj-around-list">'+d.items.map(function(x){return '<li><a href="'+e(x.url||('https://map.kakao.com/?q='+encodeURIComponent(x.name)))+'" target="_blank" rel="noopener nofollow"><b>'+e(x.name)+'</b><small>'+e(x.cat)+' · 걸어서 '+Math.max(1,Math.round((x.m||0)/70))+'분('+dist(x.m)+')</small></a></li>'}).join('')+'</ul><p class="gj-live-note">장소 정보: 카카오 · 영업 여부는 가기 전에 확인하세요</p>'})}
if(tabs&&cats.length>1){tabs.innerHTML=cats.map(function(c){return '<button type="button" data-c="'+c+'">'+(CN[c]||c)+'</button>'}).join('');
tabs.addEventListener('click',function(ev){var t=ev.target.closest('button');if(t){show(t.getAttribute('data-c'));ga('around_tab',{cat:t.getAttribute('data-c')})}})}
show(cats[0])}
var io='IntersectionObserver' in window?new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){io.unobserve(x.target);run(x.target)}})},{rootMargin:'400px'}):null;
function run(s){if(s.classList.contains('gj-blog'))blog(s);else around(s)}
function scan(){document.querySelectorAll('.gj-blog:not([data-w]),.gj-around:not([data-w])').forEach(function(s){s.setAttribute('data-w','1');io?io.observe(s):run(s)});mapBtn()}
/* SDK 불러오기 */
var sdk=null;function kakao(){return sdk||(sdk=new Promise(function(ok,no){var s=document.createElement('script');s.src='https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';s.onload=function(){try{window.Kakao.isInitialized()||window.Kakao.init(KEY);ok(window.Kakao)}catch(x){no(x)}};s.onerror=no;document.head.appendChild(s)}))}
var mapsdk=null;function maps(){return mapsdk||(mapsdk=new Promise(function(ok,no){var s=document.createElement('script');s.src='https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey='+KEY;s.onload=function(){window.kakao.maps.load(function(){ok(window.kakao.maps)})};s.onerror=no;document.head.appendChild(s)}))}
/* ③ 길안내 앱 고르기 */
function parse(h){var m=h.match(/^https:\\/\\/map\\.kakao\\.com\\/link\\/to\\/(.+),(-?[\\d.]+),(-?[\\d.]+)$/);if(!m)return null;var n=m[1];try{n=decodeURIComponent(n)}catch(x){}return{name:n,lat:+m[2],lon:+m[3],href:h}}
function app(u,fb){var t=Date.now(),gone=false,h=function(){if(document.hidden)gone=true};document.addEventListener('visibilitychange',h);location.href=u;
setTimeout(function(){document.removeEventListener('visibilitychange',h);if(!gone&&!document.hidden&&Date.now()-t<3000&&fb)location.href=fb},1600)}
function sheet(p){var old=document.querySelector('.gj-sheet');if(old)old.remove();var last='';try{last=localStorage.getItem('gj.navapp')||''}catch(x){}
var n=encodeURIComponent(p.name),A=[['kakaomap','🗺️ 카카오맵'],KEY?['kakaonavi','🧭 카카오내비']:null,['naver','🟢 네이버 지도'],['tmap','🚘 T맵']].filter(Boolean);
A.sort(function(a,b){return(b[0]===last)-(a[0]===last)});
var d=document.createElement('div');d.className='gj-sheet';d.innerHTML='<div class="gj-sheet-box" role="dialog" aria-label="길안내 앱 고르기"><b>'+e(p.name)+'</b><small>어떤 앱으로 길안내를 받을까요?</small>'+A.map(function(a){return '<button type="button" data-app="'+a[0]+'">'+a[1]+(a[0]===last?' <i>지난번</i>':'')+'</button>'}).join('')+'<button type="button" class="gj-sheet-x">닫기</button></div>';
document.body.appendChild(d);d.addEventListener('click',function(ev){var t=ev.target.closest('button');if(!t){if(ev.target===d)d.remove();return}var a=t.getAttribute('data-app');d.remove();if(!a)return;
try{localStorage.setItem('gj.navapp',a)}catch(x){}ga('navigate',{app:a,item_id:location.pathname});
if(a==='kakaomap')location.href=p.href;
else if(a==='naver')app('nmap://navigation?dlat='+p.lat+'&dlng='+p.lon+'&dname='+n+'&appname='+location.hostname,'https://map.naver.com/p/search/'+n);
else if(a==='tmap')app('tmap://route?goalname='+n+'&goalx='+p.lon+'&goaly='+p.lat,null);
else kakao().then(function(K){K.Navi.start({name:p.name,x:p.lon,y:p.lat,coordType:'wgs84'})}).catch(function(){location.href=p.href})})}
document.addEventListener('click',function(ev){if(!mob||ev.defaultPrevented)return;var a=ev.target&&ev.target.closest&&ev.target.closest('a[href^="https://map.kakao.com/link/to/"]');if(!a)return;var p=parse(a.getAttribute('href'));if(!p)return;ev.preventDefault();sheet(p)});
/* ④ 지도로 보기 */
function pts(){var out=[],k={};document.querySelectorAll('a[href^="https://map.kakao.com/link/to/"],[data-gj-pt]').forEach(function(el){if(el.closest('.gj-map,.gj-network'))return;var p;
if(el.hasAttribute('data-gj-pt')){var v=el.getAttribute('data-gj-pt').split(',');p={lat:+v[0],lon:+v[1],name:el.getAttribute('data-gj-name')||el.textContent.trim().slice(0,30),url:el.tagName==='A'?el.getAttribute('href'):null}}
else{p=parse(el.getAttribute('href'));if(!p)return;var c=el.closest('article,li,[class*=card]'),d=c&&c.querySelector('a[href^="/"],a[href^="'+location.origin+'"]');p.url=d?d.getAttribute('href'):null}
if(!(p.lat>33&&p.lat<39)||out.length>=300)return;var id=p.lat.toFixed(5)+','+p.lon.toFixed(5);if(k[id])return;k[id]=1;out.push(p)});return out}
var mb=null;function mapBtn(){if(!KEY||!MAP)return;var n=pts().length;if(n<2){if(mb)mb.hidden=true;return}
if(!mb){mb=document.createElement('button');mb.type='button';mb.className='gj-map-btn';document.body.appendChild(mb);mb.addEventListener('click',openMap)}mb.hidden=false;mb.textContent='🗺️ 지도 '+n;mb.title='지도로 보기 ('+n+'곳)';mb.setAttribute('aria-label','지도로 보기, '+n+'곳')}
function openMap(){var P=pts(),o=document.createElement('div');o.className='gj-map';o.innerHTML='<div class="gj-map-top"><b>🗺️ 지도로 보기 · '+P.length+'곳</b><button type="button">닫기 ✕</button></div><div class="gj-map-canvas"></div><div class="gj-map-pick"></div>';
document.body.appendChild(o);document.documentElement.style.overflow='hidden';ga('map_open',{item_id:location.pathname,count:P.length});
o.querySelector('.gj-map-top button').onclick=function(){o.remove();document.documentElement.style.overflow=''};
var pick=o.querySelector('.gj-map-pick');
maps().then(function(M){var m=new M.Map(o.querySelector('.gj-map-canvas'),{center:new M.LatLng(P[0].lat,P[0].lon),level:5}),bd=new M.LatLngBounds();
P.forEach(function(p){var ll=new M.LatLng(p.lat,p.lon);bd.extend(ll);var mk=new M.Marker({position:ll,map:m,title:p.name});
M.event.addListener(mk,'click',function(){pick.innerHTML='<b>'+e(p.name)+'</b><span>'+(p.url?'<a href="'+e(p.url)+'">자세히 보기</a>':'<a href="https://map.kakao.com/link/to/'+encodeURIComponent(p.name)+','+p.lat+','+p.lon+'">🧭 길찾기</a>')+'</span>';m.panTo(ll)})});
try{var me=JSON.parse(localStorage.getItem('gj.pos')||'null');if(me&&Date.now()-me.at<18e5){var c=document.createElement('div');c.className='gj-map-me';c.title='내 위치';new M.CustomOverlay({position:new M.LatLng(me.lat,me.lon),content:c,map:m});bd.extend(new M.LatLng(me.lat,me.lon))}}catch(x){}
m.setBounds(bd,40,20,40,20)}).catch(function(){pick.innerHTML='<b>지도를 불러오지 못했어요.</b>'})}
/* ⑤ 카카오톡 공유 */
document.addEventListener('click',function(ev){var b=ev.target&&ev.target.closest&&ev.target.closest('.gj-kakao');if(!b)return;ev.preventDefault();
var u=location.href.split('#')[0],m=function(s){var x=document.querySelector(s);return x?x.getAttribute('content'):''},img=m('meta[property="og:image"]')||(location.origin+'/og.png?v=2');
ga('share',{method:'kakao',item_id:location.pathname});setTimeout(function(){try{window.dispatchEvent(new CustomEvent('gj-moment',{detail:'share'}))}catch(x){}},1500);
kakao().then(function(K){K.Share.sendDefault({objectType:'feed',content:{title:document.title,description:m('meta[name=description]').slice(0,100),imageUrl:img,link:{mobileWebUrl:u,webUrl:u}},buttons:[{title:'자세히 보기',link:{mobileWebUrl:u,webUrl:u}}]})}).catch(function(){window.prompt('이 주소를 복사하세요',u)})});
if(!KEY)document.documentElement.classList.add('gj-nokakao');
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
try{var t=0;new MutationObserver(function(){clearTimeout(t);t=setTimeout(scan,300)}).observe(document.documentElement,{childList:true,subtree:true})}catch(x){}})();`;
