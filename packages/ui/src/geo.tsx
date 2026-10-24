'use client';
// Shared "내 위치" for weather·charge·traffic. No browser prompt on page load: the page first uses the approximate
// city from the visitor's IP (the site's Worker answers /api/where from Cloudflare's request.cf), shows a card that
// explains why, and asks for the precise location only when the visitor taps it. Once allowed, later visits use the
// position right away without asking again. The position stays in this browser (localStorage, plus a 30-minute
// *.guidejung.com cookie so sister sites can reuse it); servers never record it.
import {useCallback,useEffect,useState} from 'react';

export type Pos={lat:number;lon:number;precise:boolean};
type Status='idle'|'locating'|'ok'|'denied'|'unsupported';
const KEY='gj.pos',MAX_AGE=30*60e3;

// 내근처 사이트끼리(*.guidejung.com) 옮겨 다닐 때 다시 묻지 않도록, 약 100m 단위로 줄인 좌표를 30분짜리 공용 쿠키에도 둔다
// (브라우저 저장소는 사이트마다 따로라서). 서버는 이 쿠키를 읽거나 기록하지 않는다.
const COOKIE='gj_pos',shared=()=>typeof location!=='undefined'&&/(^|\.)guidejung\.com$/.test(location.hostname);
function fromCookie():{lat:number;lon:number}|null{
  try{const m=document.cookie.match(/(?:^|; )gj_pos=([\d.]+)_([\d.]+)/);if(!m)return null;const lat=+m[1],lon=+m[2];return lat>33&&lat<39&&lon>124&&lon<132?{lat,lon}:null;}catch{return null;}
}
function saved():Pos|null{
  try{const v=JSON.parse(localStorage.getItem(KEY)??'null');if(v&&Date.now()-v.at<MAX_AGE)return {lat:v.lat,lon:v.lon,precise:true};}catch{}
  const c=shared()?fromCookie():null;return c?{...c,precise:true}:null;
}
function save(p:{lat:number;lon:number}){
  try{localStorage.setItem(KEY,JSON.stringify({...p,at:Date.now()}));}catch{}
  try{if(shared())document.cookie=`${COOKIE}=${p.lat.toFixed(3)}_${p.lon.toFixed(3)}; domain=.guidejung.com; path=/; max-age=${MAX_AGE/1000}; samesite=lax; secure`;}catch{}
}
let approx:Promise<Pos|null>|null=null;
/** City-level guess from the IP (no permission needed). Mobile data IPs can point to the wrong city.
 * Cloudflare's city name is English, so each site labels it with its own nearest 시군구 instead. */
export function approximate(){return approx??=fetch('/api/where').then(r=>r.ok?r.json():null).then(d=>d&&Number.isFinite(d.lat)?{lat:d.lat,lon:d.lon,precise:false}:null).catch(()=>null);}

// One shared state per page, so every section (and the card that asks for permission) sees the same position.
let state:{pos:Pos|null;status:Status}={pos:null,status:'idle'};let started=false;
const subs=new Set<()=>void>();
function set(next:Partial<typeof state>){state={...state,...next};subs.forEach(f=>f());}
function locate(quiet:boolean){
  if(!('geolocation' in navigator)){set({status:'unsupported'});return;}
  set({status:'locating'});
  navigator.geolocation.getCurrentPosition(p=>{const v={lat:p.coords.latitude,lon:p.coords.longitude};save(v);set({pos:{...v,precise:true},status:'ok'});},
    ()=>set({status:quiet?'idle':'denied'}),{timeout:10000,maximumAge:5*60e3});
}
function start(){
  if(started)return;started=true;
  const s=saved();if(s){set({pos:s,status:'ok'});return;}
  const guess=()=>approximate().then(a=>{if(a&&!state.pos)set({pos:a});});
  // Already allowed before → use the precise position without asking; otherwise fall back to the IP guess.
  (navigator.permissions?.query({name:'geolocation' as PermissionName})??Promise.reject()).then(r=>{if(r.state==='granted')locate(true);else guess();},guess);
}

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
      `${approxLabel?`지금은 접속 위치(${approxLabel} 부근) 기준으로 보여 드려요. `:''}한 번 허용하면 30분 동안 다른 내근처 사이트에서도 다시 묻지 않아요. 위치는 서버에 저장하지 않아요.`}</p>
  </div>;
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
