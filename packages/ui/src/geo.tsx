// Shared "내 위치" for weather·charge·traffic. No browser prompt on page load: the page first uses the approximate
// city from the visitor's IP (the site's Worker answers /api/where from Cloudflare's request.cf), shows a card that
// explains why, and asks for the precise location only when the visitor taps it. Once allowed, later visits use the
// position right away without asking again.
//
// 위치정보법(위치정보지원센터 안내: 개인위치정보를 단말기에서만 쓰고 사업자 시스템으로 보내지 않으면 신고 대상 아님) — 10/27 사용자 결정:
// 정확한 좌표는 이 브라우저 밖으로 나가지 않는다. 페이지가 쓰는 pos.lat/lon은 약 2km 칸(위도 0.02°×경도 0.025°)의 중심이라
// API 주소·링크·쿠키·GA에 들어가는 것은 칸 중심뿐이고, 정확한 위치(pos.exact)는 거리 계산·정렬에만 브라우저 안에서 쓴다(fixKm·here).
import {useCallback,useEffect,useState} from 'react';
import {externalUrl,inapp,isAndroid,isIos,isSamsung,twa} from './inapp';
import {KAKAO_APPS} from './live';

/** precise: 실제 내 위치(GPS·Wi-Fi)를 안다. exact·acc(오차 m)·at(잡은 시각)은 브라우저 안에서만 쓴다.
 * src: gps(이 사이트에서 잡음) · shared(다른 내근처 사이트에서 잡은 것, 이 휴대폰 안 공용 저장소) · cell(공용 쿠키의 칸 중심) · ip(접속 위치)
 *  · pick(사용자가 '동네 직접 고르기'로 고른 곳, pick=이름 — 컴퓨터는 GPS가 없어 브라우저 위치가 몇 km 틀릴 때가 있음, 11/8 사용자). */
export type Pos={lat:number;lon:number;precise:boolean;exact?:{lat:number;lon:number};acc?:number;at?:number;src?:'gps'|'shared'|'cell'|'ip'|'pick';pick?:string};
type Status='idle'|'locating'|'ok'|'denied'|'failed'|'unsupported';
const KEY='gj.pos',MAX_AGE=30*60e3,FRESH=5*60e3,PICK_AGE=30*864e5;  // 직접 고른 곳은 30일
type Fix={lat:number;lon:number;acc?:number;at:number;pick?:string};

/** 약 2km 칸(위도 0.02°≈2.2km, 경도 0.025°≈2.2km)의 중심. 서버로 보내는 위치는 이것뿐. */
const DLAT=0.02,DLON=0.025;
export function cell(lat:number,lon:number){return {lat:+((Math.floor(lat/DLAT)+0.5)*DLAT).toFixed(4),lon:+((Math.floor(lon/DLON)+0.5)*DLON).toFixed(4)};}
const withCell=(p:Fix,src:'gps'|'shared'):Pos=>({...cell(p.lat,p.lon),precise:true,exact:{lat:p.lat,lon:p.lon},acc:p.acc,at:p.at,src:p.pick?'pick':src,pick:p.pick});
/** 거리 계산용 위치: 브라우저 안에만 있는 정확한 위치(없으면 칸 중심). */
export const here=(p:Pos)=>p.exact??{lat:p.lat,lon:p.lon};
const okFix=(v:unknown,maxAge=MAX_AGE):Fix|null=>{const x=v as Fix|null;return x&&typeof x.lat==='number'&&typeof x.lon==='number'&&x.lat>33&&x.lat<39&&x.lon>124&&x.lon<132&&typeof x.at==='number'&&(x.pick==null||typeof x.pick==='string')&&Date.now()-x.at<(x.pick?PICK_AGE:maxAge)?x:null;};

// 내근처 사이트끼리(*.guidejung.com) 옮겨 다닐 때 다시 묻지 않도록:
//  ① 정확한 위치는 이 휴대폰 안 공용 저장소(near.guidejung.com/pos 를 숨은 iframe으로 열어 그쪽 localStorage)에 30분 — 서버로는 가지 않는다.
//  ② 그게 안 되는 브라우저를 위해 칸 중심만 30분짜리 공용 쿠키(쿠키는 접속 때 서버로 함께 가지만 칸 중심뿐이고, 서버는 읽거나 기록하지 않는다).
const COOKIE='gj_pos',SHARED_KEY='gj.pos.shared',HUB='https://near.guidejung.com';
const shared=()=>typeof location!=='undefined'&&/(^|\.)guidejung\.com$/.test(location.hostname);
const isHub=()=>typeof location!=='undefined'&&location.origin===HUB;
function fromCookie():{lat:number;lon:number}|null{
  try{const m=document.cookie.match(/(?:^|; )gj_pos=([\d.]+)_([\d.]+)/);if(!m)return null;const lat=+m[1],lon=+m[2];return lat>33&&lat<39&&lon>124&&lon<132?cell(lat,lon):null;}catch{return null;}
}
let hub:Promise<Window|null>|null=null;
function hubWin(){
  return hub??=new Promise<Window|null>(ok=>{
    if(!shared()||isHub()||typeof document==='undefined'){ok(null);return;}
    const f=document.createElement('iframe');f.src=HUB+'/pos';f.title='내근처 위치 공유';f.setAttribute('aria-hidden','true');f.tabIndex=-1;
    f.style.cssText='position:absolute;width:1px;height:1px;left:-9999px;border:0';
    const t=setTimeout(()=>ok(null),4000);f.onload=()=>{clearTimeout(t);ok(f.contentWindow);};f.onerror=()=>{clearTimeout(t);ok(null);};
    document.body.appendChild(f);});
}
function sharedGet():Promise<Fix|null>{
  if(isHub()){try{return Promise.resolve(okFix(JSON.parse(localStorage.getItem(SHARED_KEY)??'null')));}catch{return Promise.resolve(null);}}
  return hubWin().then(w=>w?new Promise<Fix|null>(ok=>{const id=Math.random().toString(36).slice(2);
    const on=(e:MessageEvent)=>{if(e.origin!==HUB||e.data?.gj!=='pos'||e.data.id!==id)return;removeEventListener('message',on);clearTimeout(t);ok(okFix(e.data.v));};
    const t=setTimeout(()=>{removeEventListener('message',on);ok(null);},1500);
    addEventListener('message',on);w.postMessage({gj:'pos-get',id},HUB);}):null);
}
function sharedSet(v:Fix){
  if(isHub()){try{localStorage.setItem(SHARED_KEY,JSON.stringify(v));}catch{}return;}
  hubWin().then(w=>{w?.postMessage({gj:'pos-set',v},HUB);});
}
function saved():Fix|null{try{return okFix(JSON.parse(localStorage.getItem(KEY)??'null'));}catch{return null;}}
function save(p:Fix){
  try{localStorage.setItem(KEY,JSON.stringify(p));}catch{}
  sharedSet(p);
  try{if(shared()){const c=cell(p.lat,p.lon);document.cookie=`${COOKIE}=${c.lat}_${c.lon}; domain=.guidejung.com; path=/; max-age=${MAX_AGE/1000}; samesite=lax; secure`;}}catch{}
}
let approx:Promise<Pos|null>|null=null;
/** City-level guess from the IP (no permission needed). Mobile data IPs can point to the wrong city.
 * Cloudflare's city name is English, so each site labels it with its own nearest 시군구 instead. */
export function approximate(){return approx??=fetch('/api/where').then(r=>r.ok?r.json():null).then(d=>d&&Number.isFinite(d.lat)?{...cell(d.lat,d.lon),precise:false,src:'ip' as const}:null).catch(()=>null);}

// One shared state per page, so every section (and the card that asks for permission) sees the same position.
let state:{pos:Pos|null;status:Status;refining?:boolean;slow?:boolean}={pos:null,status:'idle'};let started=false;
const subs=new Set<()=>void>();
function set(next:Partial<typeof state>){state={...state,...next};subs.forEach(f=>f());}
const granted=()=>(navigator.permissions?.query({name:'geolocation' as PermissionName})??Promise.reject()).then(r=>r.state==='granted',()=>false);
let cancel:(()=>void)|null=null;
const moved=(a:{lat:number;lon:number},b:{lat:number;lon:number})=>km(a.lat,a.lon,b.lat,b.lon)*1000;
/** 빠른 위치 먼저(Wi-Fi·기지국) → 뒤에서 GPS(enableHighAccuracy)로 최대 20초 다듬기(오차 50m 안이면 멈춤).
 * 화면은 칸이 바뀌거나 오차가 절반 넘게 줄 때만 갱신(같은 칸이면 목록을 다시 받지 않게), 저장은 매번.
 * 직접 누른 '다시 찾기'(quiet=false)는 조용히 돌던 확인을 끊고 새로 시작하며, 저장된 위치는 쓰지 않고(maximumAge 0) 늘 '찾는 중…'을 보여 준다.
 * 같은 칸 안에서 25m 넘게 옮겨졌으면 끝난 뒤 페이지를 다시 불러 거리·순서를 새 위치로 다시 잰다(10/29: 눌러도 아무 변화가 없었음). */
function locate(quiet:boolean){
  if(!('geolocation' in navigator)){set({status:'unsupported'});return;}
  if(cancel){if(quiet)return;cancel();}
  const before=state.pos?.exact;
  if(!quiet||!before)set({status:'locating',slow:false});
  let best:Fix|null=null,w=-1,told=quiet,done=false;
  const end=(reload:boolean)=>{if(done)return;done=true;cancel=null;if(state.refining||state.slow)set({refining:false,slow:false});clearTimeout(timer);clearTimeout(slowT);if(w>=0)navigator.geolocation.clearWatch(w);w=-1;
    if(state.status==='locating')set({status:best?'ok':quiet?'idle':'failed'});
    if(reload&&!quiet&&best&&before&&state.pos?.src==='gps'){const c=cell(best.lat,best.lon),b=cell(before.lat,before.lon);
      if(c.lat===b.lat&&c.lon===b.lon&&moved(before,best)>25)location.reload();}};
  const stop=()=>end(true);
  cancel=()=>end(false);
  // 20초 다듬기는 첫 위치가 잡힌 뒤부터 센다(권한 창에 늦게 답해도 '못 잡음'으로 끝나지 않게). 첫 위치 전에는 최대 60초 기다린다.
  // 권한이 이미 허용돼 있거나 방금 허용되면 그때부터 25초(11/5: GPS가 안 잡히는 실내에서 60초 동안 '찾는 중'만 떠 있었음).
  let timer=setTimeout(stop,60000),slowT=setTimeout(()=>{if(!best&&!done)set({slow:true});},6000);
  const shorten=()=>{if(!best&&!done){clearTimeout(timer);timer=setTimeout(stop,25000);}};
  navigator.permissions?.query({name:'geolocation' as PermissionName}).then(r=>{if(r.state==='granted')shorten();else r.onchange=()=>{if(r.state==='granted')shorten();};},()=>{});
  const ok=(p:GeolocationPosition)=>{if(done)return;const first=!best;if(first){clearTimeout(timer);clearTimeout(slowT);timer=setTimeout(stop,20000);if(state.slow)set({slow:false});}const v:Fix={lat:p.coords.latitude,lon:p.coords.longitude,acc:Math.round(p.coords.accuracy),at:Date.now()};
    if(best&&best.acc!=null&&v.acc!=null&&v.acc>=best.acc)return;best=v;save(v);
    const cur=state.pos,c=cell(v.lat,v.lon);
    // 직접 누른 경우 첫 결과는 같은 칸이어도 바로 반영('방금'·오차가 바뀌어 눌린 것이 보이게).
    if((!quiet&&first)||!cur?.exact||cur.lat!==c.lat||cur.lon!==c.lon||cur.src!=='gps'||(cur.acc??1e9)>(v.acc??0)*2)set({pos:withCell(v,'gps'),status:'ok'});
    // 첫 위치가 오면 바로 결과를 보여 주고(11/5: 'GPS로 정확하게 잡는 중'이 최대 20초 떠 있었음), GPS 다듬기는 뒤에서 조용히 — PosNote에 작은 글씨로만.
    if(!quiet&&first&&(v.acc??1e9)>50&&!state.refining)set({refining:true});
    // 위치를 처음 허용해 결과가 나온 순간 → '홈 화면에 추가' 안내(install.tsx)
    if(!told){told=true;setTimeout(()=>{try{dispatchEvent(new CustomEvent('gj-moment',{detail:'located'}));}catch{}},3000);}
    if((v.acc??1e9)<=50)stop();};
  const bad=(e:GeolocationPositionError)=>{if(done)return;if(e.code===1){stop();if(!best)set({status:quiet?'idle':'denied'});}};
  navigator.geolocation.getCurrentPosition(ok,bad,{enableHighAccuracy:false,timeout:8000,maximumAge:quiet?60e3:before?0:600e3});
  w=navigator.geolocation.watchPosition(ok,bad,{enableHighAccuracy:true,timeout:20000,maximumAge:0});
}
function start(){
  if(started)return;started=true;
  const mine=saved();
  if(mine){set({pos:withCell(mine,'gps'),status:'ok'});}
  // 이미 허용한 사이트면 묻지 않고 다시 잡는다(5분 넘은 위치만). 아니면 다른 내근처 사이트에서 잡은 위치 → 칸 쿠키 → 접속 위치 순.
  // 직접 고른 곳이 있으면 GPS로 덮지 않는다(다시 바꾸려면 '내 위치 찾기'를 직접 누름).
  granted().then(g=>{
    if(mine?.pick)return;
    // 앱(TWA)은 '내 근처'를 보려고 설치한 사람이라 처음 열 때 한 번만 바로 묻는다(11/2 사용자 승인) — 웹사이트는 그대로 누를 때만.
    // 안드로이드는 두 번 거절하면 권한 창을 더 띄우지 않으므로 자동으로는 한 번뿐, 그 뒤는 위치 카드·안내 상자로.
    if(!g&&twa()){let asked=true;try{asked=localStorage.getItem('gj.twa.asked')==='1';if(!asked)localStorage.setItem('gj.twa.asked','1');}catch{}
      if(!asked)setTimeout(()=>locate(false),1000);}
    sharedGet().then(v=>{
      // 다른 내근처 사이트에서 이 사이트 위치보다 나중에 '직접 고른' 곳이 있으면 그것을 따른다(GPS로 다시 잡지 않음).
      if(v?.pick&&(!mine||v.at>mine.at)){set({pos:withCell(v,'shared'),status:'ok'});try{localStorage.setItem(KEY,JSON.stringify(v));}catch{}return;}
      if(g){if(!mine&&v&&!state.pos?.exact)set({pos:withCell(v,'shared'),status:'ok'});if(!mine||Date.now()-mine.at>FRESH)locate(true);return;}
      if(mine||state.pos?.exact)return;
      if(v){set({pos:withCell(v,'shared'),status:'ok'});return;}
      const c=shared()?fromCookie():null;
      if(c&&!state.pos){set({pos:{...c,precise:false,src:'cell'}});return;}
      if(!state.pos)approximate().then(a=>{if(a&&!state.pos)set({pos:a});});
    });
  });
  // 화면으로 돌아왔을 때(다른 앱·탭에서) 위치가 5분 넘게 묵었으면 허용된 경우에만 조용히 다시.
  document.addEventListener('visibilitychange',()=>{const p=state.pos;
    if(document.visibilityState==='visible'&&p?.exact&&!p.pick&&Date.now()-(p.at??0)>FRESH)granted().then(g=>{if(g)locate(true);});});
}

/** 지금 페이지의 위치(공유 상태) — 훅 밖의 fetch 도우미가 fixKm에 쓰도록. */
export const currentPos=()=>state.pos;
/** fetch(...).then(r=>r.json()).then(fixKmNow): 응답 거리를 브라우저 안의 정확한 위치로 다시 잰다. */
export const fixKmNow=<T,>(d:T):T=>fixKm(d,state.pos);

/** 칸 중심과 실제 위치는 최대 약 1.6km 떨어질 수 있어, 반경 검색은 그만큼 넓혀 받고(padKm) 브라우저에서 정확한 거리로 다시 자른다(within).
 * 정확한 위치를 모를 때(접속 위치·다른 사이트의 칸)는 넓히지 않는다. */
export const PAD_KM=1.6;
export const padKm=(k:number)=>state.pos?.exact?Math.round((k+PAD_KM)*10)/10:k;
/** 서버는 칸 중심에서 가까운 순으로 n곳만 자르므로, 정확한 위치를 알 때는 칸 전체를 덮을 만큼(min) 받아 휴대폰에서 다시 줄 세운다
 * (10/27: 시청 앞에서 20m 옆 발급기가 빠지고 400m 곳이 '가장 가까운 곳'으로 나왔음). */
export const padLimit=(n:number,min=300)=>state.pos?.exact?Math.max(n,min):n;
export const within=(k:number)=><T,>(d:T):T=>{const x=d as {items?:{km?:number}[]};if(state.pos?.exact&&Array.isArray(x?.items))x.items=x.items.filter(i=>i.km==null||i.km<=k);return d;};

export function useMyPosition(){
  const [,tick]=useState(0);
  useEffect(()=>{const f=()=>tick(n=>n+1);subs.add(f);start();f();return ()=>{subs.delete(f);};},[]);
  const request=useCallback(()=>locate(false),[]);
  return {pos:state.pos,status:state.status,refining:!!state.refining,request};
}

/** '동네 직접 고르기': 고른 곳을 내 위치로(30일, 이 브라우저·내근처 공용 저장소에만) 저장하고 페이지를 다시 불러 모든 목록을 새로 받는다. */
export function pickPlace(lat:number,lon:number,name:string){
  cancel?.();const v:Fix={lat,lon,at:Date.now(),pick:name.slice(0,60)};save(v);set({pos:withCell(v,'gps'),status:'ok',refining:false});
  try{(window as {gtag?:(...a:unknown[])=>void}).gtag?.('event','locate_pick',{});}catch{}
  setTimeout(()=>location.reload(),400);  // 공용 저장소(iframe)에 쓸 시간
}
// 검색은 이 브라우저에서 카카오 지도 검색(JavaScript SDK services)으로 바로 — 우리 서버를 거치지 않고, 결과는 고른 한 곳의 좌표만 남긴다.
const kakaoKey=()=>{if(typeof location==='undefined')return '';const h=location.hostname.split('.')[0];return KAKAO_APPS.find(a=>a.hosts.includes(h))?.key??'';};
type KS={Geocoder:new()=>{addressSearch:(q:string,cb:(r:{address_name:string;x:string;y:string}[],st:string)=>void)=>void};Places:new()=>{keywordSearch:(q:string,cb:(r:{place_name:string;address_name:string;road_address_name:string;x:string;y:string}[],st:string)=>void,o?:{size:number})=>void};Status:{OK:string}};
type KW={kakao?:{maps?:{load:(f:()=>void)=>void;services?:KS}}};
let svc:Promise<KS>|null=null;
function services(){return svc??=new Promise<KS>((ok,no)=>{
  const w=window as KW,done=()=>{const s=w.kakao?.maps?.services;if(s)ok(s);else{svc=null;no();}};
  if(w.kakao?.maps){w.kakao.maps.load(done);return;}
  const key=kakaoKey();if(!key){svc=null;no();return;}
  const s=document.createElement('script');s.src=`https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey=${key}`;
  s.onload=()=>w.kakao?.maps?w.kakao.maps.load(done):no();s.onerror=()=>{svc=null;no();};document.head.appendChild(s);});}
type Hit={name:string;addr:string;lat:number;lon:number};
function searchPlaces(q:string){
  return services().then(S=>Promise.all([
    new Promise<Hit[]>(ok=>new S.Geocoder().addressSearch(q,(r,st)=>ok(st===S.Status.OK?r.slice(0,3).map(x=>({name:x.address_name,addr:'주소',lat:+x.y,lon:+x.x})):[]))),
    new Promise<Hit[]>(ok=>new S.Places().keywordSearch(q,(r,st)=>ok(st===S.Status.OK?r.map(x=>({name:x.place_name,addr:x.road_address_name||x.address_name,lat:+x.y,lon:+x.x})):[]),{size:5})),
  ])).then(([a,b])=>{const seen=new Set<string>();return [...a,...b].filter(h=>h.lat>33&&h.lat<39&&h.lon>124&&h.lon<132&&!seen.has(h.name)&&!!seen.add(h.name)).slice(0,6);});
}
function PickBox({onClose}:{onClose:()=>void}){
  const [q,setQ]=useState(''),[hits,setHits]=useState<Hit[]|null>(null),[busy,setBusy]=useState(false),[err,setErr]=useState('');
  const go=(e:{preventDefault:()=>void})=>{e.preventDefault();const t=q.trim();if(!t)return;setBusy(true);setErr('');
    searchPlaces(t).then(h=>{setHits(h);if(!h.length)setErr('찾지 못했어요. 동·읍·면 이름이나 도로명 주소로 다시 찾아 보세요.');},()=>setErr('지금은 검색할 수 없어요. 잠시 뒤 다시 해 주세요.')).finally(()=>setBusy(false));};
  return <form className="gj-pick" onSubmit={go}>
    <b>🏘️ 동네 직접 고르기</b>
    <div className="gj-pick-row"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="예: 고촌읍 신곡리, 목동역, 시청" aria-label="동네·주소·장소 이름" enterKeyHint="search" autoFocus/>
      <button type="submit" disabled={busy}>{busy?'찾는 중…':'찾기'}</button><button type="button" className="gj-pick-x" onClick={onClose} aria-label="닫기">✕</button></div>
    {err&&<p className="gj-pick-err">{err}</p>}
    {!!hits?.length&&<ul>{hits.map(h=><li key={h.name+h.lat}><button type="button" onClick={()=>pickPlace(h.lat,h.lon,h.addr==='주소'?h.name:`${h.name} · ${h.addr}`)}><b>{h.name}</b><small>{h.addr}</small></button></li>)}</ul>}
    <p className="gj-pick-note">고른 곳은 이 브라우저에만 30일 기억해요. 검색어는 카카오 지도 검색으로 바로 보내고 저장하지 않아요.</p>
  </form>;
}
/** 카카오 키가 있는 사이트에서만(키는 사이트 주소마다 등록). 서버 렌더와 어긋나지 않게 화면에 붙은 뒤에 판단. */
function useCanPick(){const [c,setC]=useState(false);useEffect(()=>setC(!!kakaoKey()),[]);return c;}

const ago=(at?:number)=>{if(!at)return '';const m=Math.round((Date.now()-at)/60e3);return m<1?'방금':`${m}분 전`;};
const accText=(m?:number)=>m==null?'':m<1000?`오차 약 ${m<20?Math.max(5,Math.round(m/5)*5):Math.round(m/10)*10}m`:`오차 약 ${(m/1000).toFixed(1)}km`;
/** 정확한 위치를 쓸 때 맨 위 한 줄: '📍 내 위치 기준 · 오차 약 30m · 방금 [다시 찾기]'. 오차가 크거나(500m↑) 오래됐으면(5분↑) 다시 찾기를 강조. */
export function PosNote(){
  const {pos,status,refining,request}=useMyPosition();
  const [open,setOpen]=useState(false),can=useCanPick();
  if(!pos?.precise)return null;
  const box=open&&<PickBox onClose={()=>setOpen(false)}/>;
  if(pos.src==='pick')return <><p className="gj-posnote">📍 직접 고른 위치 · <b>{pos.pick}</b> 기준
    {can&&<button type="button" onClick={()=>setOpen(o=>!o)}>바꾸기</button>}<button type="button" onClick={request} disabled={status==='locating'}>{status==='locating'?'찾는 중…':'내 위치 찾기'}</button></p>{box}</>;
  const weak=(pos.acc??0)>500||Date.now()-(pos.at??Date.now())>FRESH;
  return <><p className={`gj-posnote${weak?' weak':''}`}>📍 내 위치 기준{pos.acc!=null&&<> · {accText(pos.acc)}</>}{pos.at&&<> · {ago(pos.at)}{pos.src==='shared'&&' 다른 내근처 사이트에서 확인'}</>}{refining&&<small> · 더 정확하게 다듬는 중</small>}
    <button type="button" onClick={request} disabled={status==='locating'}>{status==='locating'?'찾는 중…':weak?'정확하게 다시 찾기':'다시 찾기'}</button>
    {can&&<button type="button" className="gj-posnote-pick" onClick={()=>setOpen(o=>!o)}>위치가 틀려요? 직접 고르기</button>}</p>{box}</>;
}

/** 위치를 못 쓸 때 큰 안내 상자: 앱 안 브라우저면 바깥 브라우저로 여는 버튼, 아니면 이 브라우저에서 위치를 켜는 순서. */
function LocateHelp({status,onRetry}:{status:'denied'|'failed';onRetry:()=>void}){
  const app=inapp(),ext=externalUrl(app);
  const ga=(n:string,p:Record<string,unknown>)=>{try{(window as {gtag?:(...a:unknown[])=>void}).gtag?.('event',n,p);}catch{}};
  const steps:string[]=app?[]:isIos()?['주소창 왼쪽 ‘가가(aA)’ 버튼 → ‘웹 사이트 설정’ → 위치 → ‘허용’','그래도 안 되면: 휴대폰 설정 앱 → 개인정보 보호 및 보안 → 위치 서비스 → 켜기, 그 아래 ‘Safari 웹 사이트’ → ‘앱을 사용하는 동안’']
    :isSamsung()?['아래 메뉴(≡) → 설정 → 사이트 및 다운로드 → 사이트 권한 → 위치 → 이 사이트 허용','휴대폰 위에서 아래로 내려 ‘위치’가 켜져 있는지 확인']
    :isAndroid()?['주소창 왼쪽 아이콘(⚙️ 또는 자물쇠) → 권한(또는 사이트 설정) → 위치 → ‘허용’','휴대폰 위에서 아래로 내려 ‘위치’가 켜져 있는지 확인']
    :['주소창 왼쪽 아이콘(자물쇠·⚙️) → 위치 → ‘허용’ 후 새로고침'];
  return <div className="gj-locate-help" role="alert">
    <b>📍 {status==='failed'?'위치를 잡지 못했어요':app?`${app} 안에서는 위치를 쓸 수 없어요`:'위치 권한이 꺼져 있어요'}</b>
    {app?<>
      <p>{app} 안 브라우저는 위치가 막혀 있는 경우가 많아요. {ext?'아래 버튼으로 크롬·사파리 같은 브라우저에서 열면 바로 쓸 수 있어요.':isIos()?<>오른쪽 아래(또는 위) <b>⋯ 메뉴 → ‘Safari로 열기’</b>를 누르면 바로 쓸 수 있어요.</>:<><b>⋯ 메뉴 → ‘다른 브라우저로 열기’</b>를 누르면 바로 쓸 수 있어요.</>}</p>
      {ext&&<a className="gj-locate-ext" href={ext} onClick={()=>ga('locate_help',{action:'external',app})}>🌐 휴대폰 브라우저로 열기</a>}
      {app==='카카오톡'&&<p className="gj-locate-sub">카카오톡에서 계속 보려면: {isIos()?'설정 앱 → 카카오톡 → 위치 → ‘앱을 사용하는 동안’':'휴대폰 설정 → 애플리케이션(앱) → 카카오톡 → 권한 → 위치 ‘허용’'} 후 다시 누르세요.</p>}
    </>:<>
      {status==='failed'&&<p>휴대폰의 위치(GPS)가 꺼져 있거나 신호가 약할 수 있어요.</p>}
      <ol>{steps.map(t=><li key={t}>{t}</li>)}</ol>
    </>}
    <button type="button" className="gj-locate-retry" onClick={()=>{ga('locate_help',{action:'retry',app:app??''});onRetry();}}>다시 시도</button>
  </div>;
}

/** 이유를 먼저 보여 주고, 누르면 그때 브라우저 위치 권한을 묻는 카드. 못 쓰면(거부·실패) 큰 안내 상자. */
export function LocateCard({title,desc,status,onClick,approxLabel}:{title:string;desc:string;status:Status;onClick:()=>void;approxLabel?:string}){
  const cellOnly=state.pos?.src==='cell';const [open,setOpen]=useState(false),can=useCanPick();
  return <><div className="gj-locate">
    <button type="button" onClick={onClick} disabled={status==='locating'}>
      <span className="gj-locate-icon" aria-hidden="true">📍</span>
      <span className="gj-locate-text"><b>{status==='locating'?state.slow?'신호 기다리는 중… 실내면 조금 걸려요':'내 위치 찾는 중…':title}</b><small>{desc}</small></span>
      <span className="gj-locate-go" aria-hidden="true">→</span>
    </button>
    {status!=='denied'&&status!=='failed'&&<p className="gj-locate-note">{status==='unsupported'?'이 브라우저는 위치 확인을 지원하지 않아요. 지역을 직접 골라 주세요.':
      `${cellOnly?'지금은 대략적인 내 위치(약 2km 범위) 기준이에요. ':approxLabel?`지금은 접속 위치(${approxLabel} 부근) 기준으로 보여 드려요. `:''}한 번 허용하면 30분 동안 다른 내근처 사이트에서도 다시 묻지 않아요. 정확한 위치는 휴대폰 밖으로 보내지 않아요.`}</p>}
    {can&&!open&&<button type="button" className="gj-locate-pick" onClick={()=>setOpen(true)}>🏘️ 위치를 못 쓰거나 틀리면 동네 직접 고르기</button>}
    {open&&<PickBox onClose={()=>setOpen(false)}/>}
  </div>{(status==='denied'||status==='failed')&&<LocateHelp status={status} onRetry={onClick}/>}</>;
}

/**
 * 서버 응답의 거리(km·distance_km)는 칸 중심 기준이라, 브라우저 안의 정확한 위치로 다시 재고 원래 거리순이던 배열은 그 순서로 다시 줄 세운다.
 * 응답 안의 배열 중 좌표(lat|latitude, lon|lng|longitude)와 거리 필드가 있는 것만 고친다(제자리 수정 후 그대로 돌려줌).
 */
export function fixKm<T>(data:T,pos:Pos|null|undefined):T{
  const me=pos?.exact;if(!me||!data)return data;
  const walk=(v:unknown):void=>{
    if(Array.isArray(v)){
      // 원래 거리순이던 배열만 다시 줄 세운다(가격·요금순 목록은 순서 유지).
      const f0=v.find(o=>o&&typeof o==='object')as Record<string,unknown>|undefined;const fk=f0?(typeof f0.km==='number'?'km':typeof f0.distance_km==='number'?'distance_km':null):null;
      const sorted=!!fk&&v.every((o,i)=>i===0||((v[i-1] as Record<string,number>)?.[fk]??0)<=((o as Record<string,number>)?.[fk]??0));
      let touched=false;
      for(const o of v)if(o&&typeof o==='object'){const x=o as Record<string,unknown>;const la=(x.lat??x.latitude) as number|undefined,lo=(x.lon??x.lng??x.longitude) as number|undefined;
        const f='km' in x&&typeof x.km==='number'?'km':'distance_km' in x&&typeof x.distance_km==='number'?'distance_km':null;
        if(f&&typeof la==='number'&&typeof lo==='number'){x[f]=Math.round(km(me.lat,me.lon,la,lo)*100)/100;touched=true;}
        walk(o);}
      if(touched&&sorted&&fk)v.sort((a,b)=>((a as Record<string,number>)?.[fk]??Infinity)-((b as Record<string,number>)?.[fk]??Infinity));
    }else if(v&&typeof v==='object')for(const k of Object.keys(v))walk((v as Record<string,unknown>)[k]);
  };
  walk(data);return data;
}

/** Distance in km. */
export function km(aLat:number,aLon:number,bLat:number,bLon:number){
  const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));
}
/** 직접 고른 곳(pos.pick, 예: '경기 김포시 고촌읍 신곡리')의 주소에 이 지역의 시·군·구 이름이 모두 들어 있나.
 * 시도 이름은 '강원특별자치도'·'경기'처럼 표기가 달라 비교하지 않는다(같은 이름 중구·동구는 그중 가까운 쪽으로). */
const sggWords=(s:string)=>s.split(/[\s·]+/).filter(x=>/[시군구]$/.test(x)&&!/(특별|광역|자치)시$/.test(x));
/** 직접 고른 곳에서 시·군·구 이름만('김포시', '수원시 팔달구') — 서버가 지역을 고를 때 넘기는 값(칸 중심보다 넓은 정보). */
export const pickArea=(pick?:string)=>pick?sggWords(pick).join(' '):'';
export function inPick(name:string|undefined,pick:string|undefined){
  if(!pick||!name)return false;const w=new Set(sggWords(pick)),p=sggWords(name);
  return p.length>0&&p.every(x=>w.has(x));
}
/** 가장 가까운 곳. pick(직접 고른 곳의 주소)을 주면 그 주소 속 시군구와 이름이 맞는 곳 중에서 — 중심점만 보면 김포시 고촌읍이 서울 강서구로 잡힘(11/8). */
export function nearest<T extends {lat:number;lon?:number;lng?:number}>(items:T[],lat:number,lon:number,pick?:string){
  if(pick){const x=(t:T)=>{const o=t as {name?:string;label?:string};return o.name??o.label;};const hit=items.filter(t=>inPick(x(t),pick));if(hit.length)items=hit;}
  return items.reduce((a,b)=>km(lat,lon,b.lat,(b.lon??b.lng)!)<km(lat,lon,a.lat,(a.lon??a.lng)!)?b:a);
}

const short=(name:string)=>name.trim().split(' ').pop()??name;  // "서울 양천구" → "양천구"
/** 접속 위치(IP)는 통신사 거점 위치라 수십 km 틀릴 수 있어(김포 → 인천 계양구·서울 양천구) 한 지역으로 단정하지 않는다:
 * 가장 가까운 지역부터 8km 안쪽 차이의 지역 최대 3곳을 "김포시·계양구·양천구"처럼 묶어 보여 준다. */
export function broadArea(points:{name?:string;label?:string;lat:number;lon?:number;lng?:number}[],lat:number,lon:number){
  const best=new Map<string,number>();
  for(const p of points){const n=short(p.label??p.name??''),d=km(lat,lon,p.lat,(p.lon??p.lng)!);if(!(best.get(n)!<=d))best.set(n,d);}
  const list=[...best.entries()].sort((a,b)=>a[1]-b[1]);if(!list.length)return '';
  return list.filter(([,d])=>d<=list[0][1]+8).slice(0,3).map(([n])=>n).join('·');
}
