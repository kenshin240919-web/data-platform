// Shared "내 위치" for weather·charge·traffic. No browser prompt on page load: the page first uses the approximate
// city from the visitor's IP (the site's Worker answers /api/where from Cloudflare's request.cf), shows a card that
// explains why, and asks for the precise location only when the visitor taps it. Once allowed, later visits use the
// position right away without asking again.
//
// 위치정보법(위치정보지원센터 안내: 개인위치정보를 단말기에서만 쓰고 사업자 시스템으로 보내지 않으면 신고 대상 아님) — 10/27 사용자 결정:
// 정확한 좌표는 이 브라우저 밖으로 나가지 않는다. 페이지가 쓰는 pos.lat/lon은 약 2km 칸(위도 0.02°×경도 0.025°)의 중심이라
// API 주소·링크·쿠키·GA에 들어가는 것은 칸 중심뿐이고, 정확한 위치(pos.exact)는 거리 계산·정렬에만 브라우저 안에서 쓴다(fixKm·here).
import {useCallback,useEffect,useState} from 'react';

export type Pos={lat:number;lon:number;precise:boolean;exact?:{lat:number;lon:number}};
type Status='idle'|'locating'|'ok'|'denied'|'unsupported';
const KEY='gj.pos',MAX_AGE=30*60e3;

/** 약 2km 칸(위도 0.02°≈2.2km, 경도 0.025°≈2.2km)의 중심. 서버로 보내는 위치는 이것뿐. */
const DLAT=0.02,DLON=0.025;
export function cell(lat:number,lon:number){return {lat:+((Math.floor(lat/DLAT)+0.5)*DLAT).toFixed(4),lon:+((Math.floor(lon/DLON)+0.5)*DLON).toFixed(4)};}
const withCell=(p:{lat:number;lon:number},precise:boolean):Pos=>({...cell(p.lat,p.lon),precise,exact:{lat:p.lat,lon:p.lon}});
/** 거리 계산용 위치: 브라우저 안에만 있는 정확한 위치(없으면 칸 중심). */
export const here=(p:Pos)=>p.exact??{lat:p.lat,lon:p.lon};

// 내근처 사이트끼리(*.guidejung.com) 옮겨 다닐 때 다시 묻지 않도록 칸 중심만 30분짜리 공용 쿠키에 둔다
// (브라우저 저장소는 사이트마다 따로라서). 쿠키는 접속 때 서버로 함께 가지만 칸 중심뿐이고, 서버는 읽거나 기록하지 않는다.
const COOKIE='gj_pos',shared=()=>typeof location!=='undefined'&&/(^|\.)guidejung\.com$/.test(location.hostname);
function fromCookie():{lat:number;lon:number}|null{
  try{const m=document.cookie.match(/(?:^|; )gj_pos=([\d.]+)_([\d.]+)/);if(!m)return null;const lat=+m[1],lon=+m[2];return lat>33&&lat<39&&lon>124&&lon<132?cell(lat,lon):null;}catch{return null;}
}
function saved():Pos|null{
  try{const v=JSON.parse(localStorage.getItem(KEY)??'null');if(v&&Date.now()-v.at<MAX_AGE)return withCell(v,true);}catch{}
  const c=shared()?fromCookie():null;return c?{...c,precise:true}:null;
}
function save(p:{lat:number;lon:number}){
  try{localStorage.setItem(KEY,JSON.stringify({...p,at:Date.now()}));}catch{}
  try{if(shared()){const c=cell(p.lat,p.lon);document.cookie=`${COOKIE}=${c.lat}_${c.lon}; domain=.guidejung.com; path=/; max-age=${MAX_AGE/1000}; samesite=lax; secure`;}}catch{}
}
let approx:Promise<Pos|null>|null=null;
/** City-level guess from the IP (no permission needed). Mobile data IPs can point to the wrong city.
 * Cloudflare's city name is English, so each site labels it with its own nearest 시군구 instead. */
export function approximate(){return approx??=fetch('/api/where').then(r=>r.ok?r.json():null).then(d=>d&&Number.isFinite(d.lat)?{...cell(d.lat,d.lon),precise:false}:null).catch(()=>null);}

// One shared state per page, so every section (and the card that asks for permission) sees the same position.
let state:{pos:Pos|null;status:Status}={pos:null,status:'idle'};let started=false;
const subs=new Set<()=>void>();
function set(next:Partial<typeof state>){state={...state,...next};subs.forEach(f=>f());}
function locate(quiet:boolean){
  if(!('geolocation' in navigator)){set({status:'unsupported'});return;}
  set({status:'locating'});
  navigator.geolocation.getCurrentPosition(p=>{const v={lat:p.coords.latitude,lon:p.coords.longitude};save(v);set({pos:withCell(v,true),status:'ok'});},
    ()=>set({status:quiet?'idle':'denied'}),{timeout:10000,maximumAge:5*60e3});
}
function start(){
  if(started)return;started=true;
  const s=saved();if(s){set({pos:s,status:'ok'});if(s.exact)return;}
  const guess=()=>{if(!state.pos)approximate().then(a=>{if(a&&!state.pos)set({pos:a});});};
  // Already allowed before → use the precise position without asking (also refines a sister site's 칸 from the cookie);
  // otherwise fall back to the IP guess.
  (navigator.permissions?.query({name:'geolocation' as PermissionName})??Promise.reject()).then(r=>{if(r.state==='granted')locate(true);else guess();},guess);
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

/** 이유를 먼저 보여 주고, 누르면 그때 브라우저 위치 권한을 묻는 카드. */
export function LocateCard({title,desc,status,onClick,approxLabel}:{title:string;desc:string;status:Status;onClick:()=>void;approxLabel?:string}){
  return <div className="gj-locate">
    <button type="button" onClick={onClick} disabled={status==='locating'}>
      <span className="gj-locate-icon" aria-hidden="true">📍</span>
      <span className="gj-locate-text"><b>{status==='locating'?'위치 확인 중…':title}</b><small>{desc}</small></span>
      <span className="gj-locate-go" aria-hidden="true">→</span>
    </button>
    <p className="gj-locate-note">{status==='denied'?'위치 권한이 꺼져 있어요. 브라우저 주소창의 자물쇠(사이트 설정)에서 위치를 허용하면 바로 쓸 수 있어요.':
      status==='unsupported'?'이 브라우저는 위치 확인을 지원하지 않아요. 지역을 직접 골라 주세요.':
      `${approxLabel?`지금은 접속 위치(${approxLabel} 부근) 기준으로 보여 드려요. `:''}한 번 허용하면 30분 동안 다른 내근처 사이트에서도 다시 묻지 않아요. 정확한 위치는 휴대폰 밖으로 보내지 않아요.`}</p>
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
