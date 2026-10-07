'use client';
import {useEffect} from 'react';
import {usePathname} from 'next/navigation';
import {ADSENSE_CLIENT,DISPLAY_SLOT} from './adsense';

declare global{interface Window{adsbygoogle?:unknown[]}}

function Unit(){
  // Fill once per mount; a second push for the same <ins> (dev double effects) throws, which is harmless.
  useEffect(()=>{try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch{}},[]);
  return <ins className="adsbygoogle" style={{display:'block'}} data-ad-client={ADSENSE_CLIENT} data-ad-slot={DISPLAY_SLOT} data-ad-format="auto" data-full-width-responsive="true"/>;
}

/** Labeled manual display ad. Keyed by path so client-side navigation requests a fresh ad. */
export function AdSlot(){
  const path=usePathname();
  return <aside className="ad-slot" aria-label="광고"><span className="ad-label">광고</span><Unit key={path}/></aside>;
}
