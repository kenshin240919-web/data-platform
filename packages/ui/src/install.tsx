'use client';
// "홈 화면에 추가" 안내(10/27 개선 A~D):
//  A 쓸모를 느낀 순간(☆ 즐겨찾기 담기·위치 허용 후 결과·공유)에 바로 — 'gj-moment' 이벤트(actions.ts·live.ts·geo.tsx가 보냄)
//  B 방문 횟수는 내근처 사이트끼리 합산(*.guidejung.com 공용 쿠키 gj_visits — 숫자와 시각뿐), 두 번째 방문부터
//  C 카카오톡·네이버·인스타그램 같은 앱 안 브라우저면 '홈 화면에 추가'가 안 되므로 '브라우저로 열기' 안내(카카오톡은 버튼 하나로)
//  D GA 이벤트 install_hint(보임)·install_click(추가하기·브라우저로 열기)·install_done(설치 완료)
// 이미 앱처럼 열었거나 ✕로 닫은 지 30일이 안 됐으면 숨김. 안드로이드 크롬 등은 브라우저 설치 창(beforeinstallprompt), 아이폰 사파리는 방법 안내.
import {useEffect,useState} from 'react';
import {externalUrl,inapp,isIos} from './inapp';

type BIP=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
type Mode='none'|'prompt'|'ios'|'inapp';
let deferred:BIP|null=null;const subs=new Set<()=>void>();
const ga=(n:string,p:Record<string,unknown>)=>{try{(window as {gtag?:(...a:unknown[])=>void}).gtag?.('event',n,p);}catch{}};
if(typeof window!=='undefined'){
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e as BIP;subs.forEach(f=>f());});
  window.addEventListener('appinstalled',()=>ga('install_done',{site:location.hostname.split('.')[0]}));
}
const VISITS='gj.visits',OFF='gj.install.off',GAP=30*60e3,QUIET=30*864e5;
const shared=()=>/(^|\.)guidejung\.com$/.test(location.hostname);

/** 방문 횟수(30분 넘게 지나 다시 오면 +1). 내근처 사이트끼리는 공용 쿠키로 합산, 아니면 이 사이트 저장소. */
function visits(){
  try{
    let v={n:0,at:0};
    const m=shared()?document.cookie.match(/(?:^|; )gj_visits=(\d+)_(\d+)/):null;
    if(m)v={n:+m[1],at:+m[2]};else{const s=JSON.parse(localStorage.getItem(VISITS)??'null');if(s)v=s;}
    if(Date.now()-v.at>GAP)v.n++;v.at=Date.now();
    localStorage.setItem(VISITS,JSON.stringify(v));
    if(shared())document.cookie=`gj_visits=${v.n}_${v.at}; domain=.guidejung.com; path=/; max-age=${365*864e2}; samesite=lax; secure`;
    return v.n;
  }catch{return 0;}
}
const standalone=()=>matchMedia('(display-mode: standalone)').matches||(navigator as {standalone?:boolean}).standalone===true;
const ios=isIos;
/** 을/를 */
const eul=(w:string)=>{const c=(w.trim().slice(-1).charCodeAt(0)||0)-0xac00;return `‘${w}’${c>=0&&c<11172&&c%28?'을':'를'}`;};
const off=()=>{try{return Date.now()-Number(localStorage.getItem(OFF)??0)<QUIET;}catch{return false;}};

export function InstallHint({brand}:{brand:string}){
  const [mode,setMode]=useState<Mode>('none');const [why,setWhy]=useState('');const [app,setApp]=useState<string|null>(null);
  useEffect(()=>{
    const n=visits();
    if(standalone()||off())return;
    const a=inapp();setApp(a);
    let shown=false;
    const show=(trigger:string)=>{
      if(shown||standalone()||off())return;
      const m:Mode=a?'inapp':ios()?'ios':deferred?'prompt':'none';
      if(m==='none')return;
      shown=true;setWhy(trigger);setMode(m);ga('install_hint',{mode:m,trigger,app:a??'',site:location.hostname.split('.')[0]});
    };
    if(n>=2)show('visit');
    // 안드로이드: 설치 창 준비가 늦게 오면 그때 다시 시도.
    const f=()=>{if(n>=2)show('visit');};subs.add(f);
    const moment=(e:Event)=>show((e as CustomEvent).detail??'moment');
    addEventListener('gj-moment',moment);
    return ()=>{subs.delete(f);removeEventListener('gj-moment',moment);};
  },[]);
  if(mode==='none')return null;
  const close=()=>{try{localStorage.setItem(OFF,String(Date.now()));}catch{}setMode('none');};
  const add=async()=>{if(!deferred)return;ga('install_click',{mode,trigger:why});await deferred.prompt();const r=await deferred.userChoice.catch(()=>null);deferred=null;if(r?.outcome==='accepted')setMode('none');else close();};
  const ext=app?externalUrl(app):null;
  const lead=why==='fav'?'즐겨찾기한 곳, 다음엔 홈 화면에서 바로 확인하세요. ':why==='located'?'내 주변 정보를 다음엔 한 번에 여세요. ':why==='share'?'공유한 정보, 다음엔 홈 화면에서 바로 여세요. ':'';
  return <div className="gj-install" role="region" aria-label="홈 화면에 추가">
    <span aria-hidden="true">📲</span>
    <p>{mode==='inapp'?<>{lead}지금은 {app} 안에서 열려 있어요. {ext?'브라우저로 열면':ios()?<>오른쪽 아래·위 <b>⋯ 메뉴 → ‘Safari로 열기’</b> 후</>:<><b>⋯ 메뉴 → ‘다른 브라우저로 열기’</b> 후</>} {eul(brand)} 홈 화면에 둘 수 있어요.</>
      :mode==='ios'?<>{lead}홈 화면에 {eul(brand)} 두면 앱처럼 바로 열려요. 아래 <b>공유 버튼(⬆︎)</b> → <b>‘홈 화면에 추가’</b>를 누르세요.</>
      :<>{lead}홈 화면에 {eul(brand)} 두면 앱처럼 바로 열려요.</>}</p>
    {mode==='prompt'&&<button type="button" onClick={add}>추가하기</button>}
    {mode==='inapp'&&ext&&<a className="gj-install-go" href={ext} onClick={()=>ga('install_click',{mode,trigger:why,app})}>브라우저로 열기</a>}
    <button type="button" className="gj-install-x" onClick={close} aria-label="닫기">✕</button>
  </div>;
}
