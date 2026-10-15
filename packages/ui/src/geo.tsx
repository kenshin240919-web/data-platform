'use client';
// Shared "내 위치" for weather·charge·traffic. No browser prompt on page load: the page first uses the approximate
// city from the visitor's IP (the site's Worker answers /api/where from Cloudflare's request.cf), shows a card that
// explains why, and asks for the precise location only when the visitor taps it. Once allowed, later visits use the
// position right away without asking again. The position stays in this browser (localStorage) and is never sent.
import {useCallback,useEffect,useState} from 'react';

export type Pos={lat:number;lon:number;precise:boolean};
type Status='idle'|'locating'|'ok'|'denied'|'unsupported';
const KEY='gj.pos',MAX_AGE=30*60e3;

function saved():Pos|null{try{const v=JSON.parse(localStorage.getItem(KEY)??'null');return v&&Date.now()-v.at<MAX_AGE?{lat:v.lat,lon:v.lon,precise:true}:null;}catch{return null;}}
function save(p:{lat:number;lon:number}){try{localStorage.setItem(KEY,JSON.stringify({...p,at:Date.now()}));}catch{}}
let approx:Promise<Pos|null>|null=null;
/** City-level guess from the IP (no permission needed). Mobile data IPs can point to the wrong city.
 * Cloudflare's city name is English, so each site labels it with its own nearest 시군구 instead. */
export function approximate(){return approx??=fetch('/api/where').then(r=>r.ok?r.json():null).then(d=>d&&Number.isFinite(d.lat)?{lat:d.lat,lon:d.lon,precise:false}:null).catch(()=>null);}

export function useMyPosition(){
  const [pos,setPos]=useState<Pos|null>(null);const [status,setStatus]=useState<Status>('idle');
  const locate=useCallback((quiet=false)=>{
    if(!('geolocation' in navigator)){setStatus('unsupported');return;}
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(p=>{const v={lat:p.coords.latitude,lon:p.coords.longitude};save(v);setPos({...v,precise:true});setStatus('ok');},
      ()=>setStatus(quiet?'idle':'denied'),{timeout:10000,maximumAge:5*60e3});
  },[]);
  useEffect(()=>{
    const s=saved();if(s){setPos(s);setStatus('ok');return;}
    let alive=true;
    // Already allowed before → use the precise position without asking; otherwise fall back to the IP guess.
    (navigator.permissions?.query({name:'geolocation' as PermissionName})??Promise.reject()).then(r=>{if(!alive)return;
      if(r.state==='granted')locate(true);else approximate().then(a=>{if(alive&&a)setPos(p=>p??a);});
    },()=>approximate().then(a=>{if(alive&&a)setPos(p=>p??a);}));
    return ()=>{alive=false;};
  },[locate]);
  return {pos,status,request:()=>locate(false)};
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
      `${approxLabel?`지금은 접속 위치(${approxLabel} 부근) 기준으로 보여 드려요. `:''}위치는 이 브라우저 안에서만 쓰고 저장·전송하지 않아요.`}</p>
  </div>;
}

/** Distance in km. */
export function km(aLat:number,aLon:number,bLat:number,bLon:number){
  const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));
}
export function nearest<T extends {lat:number;lon?:number;lng?:number}>(items:T[],lat:number,lon:number){
  return items.reduce((a,b)=>km(lat,lon,b.lat,(b.lon??b.lng)!)<km(lat,lon,a.lat,(a.lon??a.lng)!)?b:a);
}
