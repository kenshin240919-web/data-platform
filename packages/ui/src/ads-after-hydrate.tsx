'use client';
// 11/14: React가 화면을 다 붙인 뒤(첫 useEffect) 광고 코드를 부름 — adsense-script.tsx adsLoaderJs의 window.gjAdsGo.
import {useEffect} from 'react';
export function AdsAfterHydrate(){useEffect(()=>{(window as {gjAdsGo?:()=>void}).gjAdsGo?.();},[]);return null;}
