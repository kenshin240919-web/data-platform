'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {ADSENSE_CLIENT,DISPLAY_SLOT} from './adsense';

declare global{interface Window{adsbygoogle?:unknown[]}}

function Unit(){
  // Fill once per mount; a second push for the same <ins> (dev double effects) throws, which is harmless.
  // 11/14: 칸 너비가 0일 때(앱이 화면 밖에서 미리 불러 둔 페이지·숨은 칸) 채우면 애드센스가 'No slot size for availableWidth=0'
  // 오류를 내고 그 칸은 비어 버림(일자리 Clarity 스크립트 오류 7%) → 너비가 생길 때까지 기다렸다가 한 번만 채운다.
  const ref=useRef<HTMLModElement>(null);
  useEffect(()=>{const el=ref.current;if(!el)return;let done=false;
    const go=()=>{if(done||el.offsetWidth===0)return;done=true;ro?.disconnect();try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch{}};
    const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(go):null;ro?.observe(el);go();
    return ()=>{done=true;ro?.disconnect();};},[]);
  return <ins ref={ref} className="adsbygoogle" style={{display:'block'}} data-ad-client={ADSENSE_CLIENT} data-ad-slot={DISPLAY_SLOT} data-ad-format="auto" data-full-width-responsive="true"/>;
}

/** Labeled manual display ad. Keyed by path so client-side navigation requests a fresh ad. */
export function AdSlot(){
  const path=usePathname();
  return <aside className="ad-slot" aria-label="광고"><span className="ad-label">광고</span><Unit key={path}/></aside>;
}
