// Shared "내 위치" for weather·charge·traffic. No browser prompt on page load: the page first uses the approximate
// city from the visitor's IP (the site's Worker answers /api/where from Cloudflare's request.cf), shows a card that
// explains why, and asks for the precise location only when the visitor taps it. Once allowed, later visits use the
// position right away without asking again.
//
// 위치정보법(위치정보지원센터 안내: 개인위치정보를 단말기에서만 쓰고 사업자 시스템으로 보내지 않으면 신고 대상 아님) — 10/27 사용자 결정:
// 정확한 좌표는 이 브라우저 밖으로 나가지 않는다. 페이지가 쓰는 pos.lat/lon은 약 2km 칸(위도 0.02°×경도 0.025°)의 중심이라
// API 주소·링크·쿠키·GA에 들어가는 것은 칸 중심뿐이고, 정확한 위치(pos.exact)는 거리 계산·정렬에만 브라우저 안에서 쓴다(fixKm·here).
import {useCallback,useEffect,useState} from 'react';

/** precise: 실제 내 위치(GPS·Wi-Fi)를 안다. exact·acc(오차 m)·at(잡은 시각)은 브라우저 안에서만 쓴다.
 * src: gps(이 사이트에서 잡음) · shared(다른 내근처 사이트에서 잡은 것, 이 휴대폰 안 공용 저장소) · cell(공용 쿠키의 칸 중심) · ip(접속 위치). */
export type Pos={lat:number;lon:number;precise:boolean;exact?:{lat:number;lon:number};acc?:number;at?:number;src?:'gps'|'shared'|'cell'|'ip'};
type Status='idle'|'locating'|'ok'|'denied'|'failed'|'unsupported';
const KEY='gj.pos',MAX_AGE=30*60e3,FRESH=5*60e3;
type Fix={lat:number;lon:number;acc?:number;at:number};

/** 약 2km 칸(위도 0.02°≈2.2km, 경도 0.025°≈2.2km)의 중심. 서버로 보내는 위치는 이것뿐. */
const DLAT=0.02,DLON=0.025;
export function cell(lat:number,lon:number){return {lat:+((Math.floor(lat/DLAT)+0.5)*DLAT).toFixed(4),lon:+((Math.floor(lon/DLON)+0.5)*DLON).toFixed(4)};}
const withCell=(p:Fix,src:'gps'|'shared'):Pos=>({...cell(p.lat,p.lon),precise:true,exact:{lat:p.lat,lon:p.lon},acc:p.acc,at:p.at,src});
/** 거리 계산용 위치: 브라우저 안에만 있는 정확한 위치(없으면 칸 중심). */
export const here=(p:Pos)=>p.exact??{lat:p.lat,lon:p.lon};
const okFix=(v:unknown,maxAge=MAX_AGE):Fix|null=>{const x=v as Fix|null;return x&&typeof x.lat==='number'&&typeof x.lon==='number'&&x.lat>33&&x.lat<39&&x.lon>124&&x.lon<132&&typeof x.at==='number'&&Date.now()-x.at<maxAge?x:null;};

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
let state:{pos:Pos|null;status:Status}={pos:null,status:'idle'};let started=false;
const subs=new Set<()=>void>();
function set(next:Partial<typeof state>){state={...state,...next};subs.forEach(f=>f());}
const granted=()=>(navigator.permissions?.query({name:'geolocation' as PermissionName})??Promise.reject()).then(r=>r.state==='granted',()=>false);
let watching=false;
/** 빠른 위치 먼저(Wi-Fi·기지국) → 뒤에서 GPS(enableHighAccuracy)로 최대 20초 다듬기(오차 50m 안이면 멈춤).
 * 화면은 칸이 바뀌거나 오차가 절반 넘게 줄 때만 갱신(같은 칸이면 목록을 다시 받지 않게), 저장은 매번. */
function locate(quiet:boolean){
  if(!('geolocation' in navigator)){set({status:'unsupported'});return;}
  if(watching)return;watching=true;
  if(!state.pos?.exact)set({status:'locating'});
  let best:Fix|null=null,w=-1;
  const stop=()=>{if(w>=0)navigator.geolocation.clearWatch(w);w=-1;watching=false;if(state.status==='locating')set({status:best?'ok':quiet?'idle':'failed'});};
  const ok=(p:GeolocationPosition)=>{const v:Fix={lat:p.coords.latitude,lon:p.coords.longitude,acc:Math.round(p.coords.accuracy),at:Date.now()};
    if(best&&best.acc!=null&&v.acc!=null&&v.acc>=best.acc)return;best=v;save(v);
    const cur=state.pos,c=cell(v.lat,v.lon);
    if(!cur?.exact||cur.lat!==c.lat||cur.lon!==c.lon||cur.src!=='gps'||(cur.acc??1e9)>(v.acc??0)*2)set({pos:withCell(v,'gps'),status:'ok'});
    if((v.acc??1e9)<=50)stop();};
  const bad=(e:GeolocationPositionError)=>{if(e.code===1){stop();if(!best)set({status:quiet?'idle':'denied'});}};
  navigator.geolocation.getCurrentPosition(ok,bad,{enableHighAccuracy:false,timeout:8000,maximumAge:60e3});
  w=navigator.geolocation.watchPosition(ok,bad,{enableHighAccuracy:true,timeout:20000,maximumAge:0});
  setTimeout(stop,20000);
}
function start(){
  if(started)return;started=true;
  const mine=saved();
  if(mine){set({pos:withCell(mine,'gps'),status:'ok'});}
  // 이미 허용한 사이트면 묻지 않고 다시 잡는다(5분 넘은 위치만). 아니면 다른 내근처 사이트에서 잡은 위치 → 칸 쿠키 → 접속 위치 순.
  granted().then(g=>{
    if(g){if(!mine||Date.now()-mine.at>FRESH)locate(true);return;}
    if(mine)return;
    sharedGet().then(v=>{
      if(state.pos?.exact)return;
      if(v){set({pos:withCell(v,'shared'),status:'ok'});return;}
      const c=shared()?fromCookie():null;
      if(c&&!state.pos){set({pos:{...c,precise:false,src:'cell'}});return;}
      if(!state.pos)approximate().then(a=>{if(a&&!state.pos)set({pos:a});});
    });
  });
  // 화면으로 돌아왔을 때(다른 앱·탭에서) 위치가 5분 넘게 묵었으면 허용된 경우에만 조용히 다시.
  document.addEventListener('visibilitychange',()=>{const p=state.pos;
    if(document.visibilityState==='visible'&&p?.exact&&Date.now()-(p.at??0)>FRESH)granted().then(g=>{if(g)locate(true);});});
}

/** 지금 페이지의 위치(공유 상태) — 훅 밖의 fetch 도우미가 fixKm에 쓰도록. */
export const currentPos=()=>state.pos;
/** fetch(...).then(r=>r.json()).then(fixKmNow): 응답 거리를 브라우저 안의 정확한 위치로 다시 잰다. */
export const fixKmNow=<T,>(d:T):T=>fixKm(d,state.pos);

/** 칸 중심과 실제 위치는 최대 약 1.6km 떨어질 수 있어, 반경 검색은 그만큼 넓혀 받고(padKm) 브라우저에서 정확한 거리로 다시 자른다(within).
 * 정확한 위치를 모를 때(접속 위치·다른 사이트의 칸)는 넓히지 않는다. */
export const PAD_KM=1.6;
export const padKm=(k:number)=>state.pos?.exact?Math.round((k+PAD_KM)*10)/10:k;
export const within=(k:number)=><T,>(d:T):T=>{const x=d as {items?:{km?:number}[]};if(state.pos?.exact&&Array.isArray(x?.items))x.items=x.items.filter(i=>i.km==null||i.km<=k);return d;};

export function useMyPosition(){
  const [,tick]=useState(0);
  useEffect(()=>{const f=()=>tick(n=>n+1);subs.add(f);start();f();return ()=>{subs.delete(f);};},[]);
  const request=useCallback(()=>locate(false),[]);
  return {pos:state.pos,status:state.status,request};
}

const ago=(at?:number)=>{if(!at)return '';const m=Math.round((Date.now()-at)/60e3);return m<1?'방금':`${m}분 전`;};
const accText=(m?:number)=>m==null?'':m<1000?`오차 약 ${m<20?Math.max(5,Math.round(m/5)*5):Math.round(m/10)*10}m`:`오차 약 ${(m/1000).toFixed(1)}km`;
/** 정확한 위치를 쓸 때 맨 위 한 줄: '📍 내 위치 기준 · 오차 약 30m · 방금 [다시 찾기]'. 오차가 크거나(500m↑) 오래됐으면(5분↑) 다시 찾기를 강조. */
export function PosNote(){
  const {pos,status,request}=useMyPosition();
  if(!pos?.precise)return null;
  const weak=(pos.acc??0)>500||Date.now()-(pos.at??Date.now())>FRESH;
  return <p className={`gj-posnote${weak?' weak':''}`}>📍 내 위치 기준{pos.acc!=null&&<> · {accText(pos.acc)}</>}{pos.at&&<> · {ago(pos.at)}{pos.src==='shared'&&' 다른 내근처 사이트에서 확인'}</>}
    <button type="button" onClick={request} disabled={status==='locating'}>{status==='locating'?'찾는 중…':weak?'정확하게 다시 찾기':'다시 찾기'}</button></p>;
}

/** 이유를 먼저 보여 주고, 누르면 그때 브라우저 위치 권한을 묻는 카드. */
export function LocateCard({title,desc,status,onClick,approxLabel}:{title:string;desc:string;status:Status;onClick:()=>void;approxLabel?:string}){
  const cellOnly=state.pos?.src==='cell';
  return <div className="gj-locate">
    <button type="button" onClick={onClick} disabled={status==='locating'}>
      <span className="gj-locate-icon" aria-hidden="true">📍</span>
      <span className="gj-locate-text"><b>{status==='locating'?'위치 확인 중… (GPS로 정확하게 잡는 중)':title}</b><small>{desc}</small></span>
      <span className="gj-locate-go" aria-hidden="true">→</span>
    </button>
    <p className="gj-locate-note">{status==='denied'?'위치 권한이 꺼져 있어요. 브라우저 주소창의 자물쇠(사이트 설정)에서 위치를 허용하면 바로 쓸 수 있어요.':
      status==='failed'?'위치를 잡지 못했어요. 휴대폰 설정에서 위치(GPS)가 켜져 있는지 확인하고 다시 눌러 주세요.':
      status==='unsupported'?'이 브라우저는 위치 확인을 지원하지 않아요. 지역을 직접 골라 주세요.':
      `${cellOnly?'지금은 대략적인 내 위치(약 2km 범위) 기준이에요. ':approxLabel?`지금은 접속 위치(${approxLabel} 부근) 기준으로 보여 드려요. `:''}한 번 허용하면 30분 동안 다른 내근처 사이트에서도 다시 묻지 않아요. 정확한 위치는 휴대폰 밖으로 보내지 않아요.`}</p>
  </div>;
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
export function nearest<T extends {lat:number;lon?:number;lng?:number}>(items:T[],lat:number,lon:number){
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
