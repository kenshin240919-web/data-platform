'use client';
// "홈 화면에 추가" 안내: 두 번째 방문부터(30분 넘게 지나 다시 온 경우만 1회로 셈), 이미 앱처럼 열었거나 닫은 지 30일이 안 됐으면 숨김.
// 안드로이드 크롬 등은 브라우저의 설치 창(beforeinstallprompt)을 띄우고, 아이폰은 공유 → '홈 화면에 추가' 방법을 보여 준다.
import {useEffect,useState} from 'react';

type BIP=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
let deferred:BIP|null=null;const subs=new Set<()=>void>();
if(typeof window!=='undefined')window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e as BIP;subs.forEach(f=>f());});
const VISITS='gj.visits',OFF='gj.install.off',GAP=30*60e3,QUIET=30*864e5;

function visits(){try{const v=JSON.parse(localStorage.getItem(VISITS)??'null')??{n:0,at:0};if(Date.now()-v.at>GAP)v.n++;v.at=Date.now();localStorage.setItem(VISITS,JSON.stringify(v));return v.n as number;}catch{return 0;}}
const standalone=()=>matchMedia('(display-mode: standalone)').matches||(navigator as {standalone?:boolean}).standalone===true;
const ios=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);

export function InstallHint({brand}:{brand:string}){
  const [mode,setMode]=useState<'none'|'prompt'|'ios'>('none');
  useEffect(()=>{
    const n=visits();let off=0;try{off=Number(localStorage.getItem(OFF)??0);}catch{}
    if(n<2||standalone()||Date.now()-off<QUIET)return;
    if(ios()){setMode('ios');return;}
    const f=()=>setMode(deferred?'prompt':'none');f();subs.add(f);return ()=>{subs.delete(f);};
  },[]);
  if(mode==='none')return null;
  const close=()=>{try{localStorage.setItem(OFF,String(Date.now()));}catch{}setMode('none');};
  const add=async()=>{if(!deferred)return;await deferred.prompt();const r=await deferred.userChoice.catch(()=>null);deferred=null;if(r?.outcome==='accepted')setMode('none');else close();};
  return <div className="gj-install" role="region" aria-label="홈 화면에 추가">
    <span aria-hidden="true">📲</span>
    <p>{mode==='ios'?<>홈 화면에 ‘{brand}’를 두면 앱처럼 바로 열려요. 아래 <b>공유 버튼(⬆︎)</b> → <b>‘홈 화면에 추가’</b>를 누르세요.</>:<>홈 화면에 ‘{brand}’를 두면 앱처럼 바로 열려요.</>}</p>
    {mode==='prompt'&&<button type="button" onClick={add}>추가하기</button>}
    <button type="button" className="gj-install-x" onClick={close} aria-label="닫기">✕</button>
  </div>;
}
