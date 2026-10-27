// Detail page HTML for places served from D1: the same ShellView/DetailView as the static build, plus the same <head>.
import {renderToString} from 'react-dom/server';
import type {Place,Status} from '../../../packages/ui/src/types';
import {DetailView,PARKING_NEAR,ShellView,placeDescription,type Nearby} from '../../../packages/ui/src/views';
import {detailPath,IMAGE_FALLBACK} from '../../../packages/ui/src/kinds';
import {ADSENSE_CLIENT} from '../../../packages/ui/src/adsense';
import {gaInline} from '../../../packages/ui/src/ga-script';

const ORIGIN='https://trip.guidejung.com';
const NAVER='195cb1e9feccc177b628910264a591df2668c259';
const CLARITY='yxgv6hkcoz';
const GA='G-WN326BYC7E';
const esc=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));

/** styles: the <link rel="stylesheet"> tags of the static build (hashed file names change every build). */
export function detailHtml({place,nearby,status,styles,today}:{place:Place;nearby:Nearby[];status:Status|null;styles:string;today:string}){
  const path=detailPath(place),url=ORIGIN+path,title=`${place.name} | 내근처 여행`;
  const index=place.indexable&&!place.is_demo;
  const DESC=esc(placeDescription(place));const image=place.images?.[0]?.url||ORIGIN+'/og.png?v=2';
  const body=renderToString(<ShellView status={status}><DetailView place={place} nearby={nearby} today={today}/></ShellView>);
  const clarity=`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY}");`;
  return `<!DOCTYPE html><html lang="ko"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="color-scheme" content="light dark"/><script async src="https://www.googletagmanager.com/gtag/js?id=${GA}"></script><script>${gaInline(GA)}</script><script>${IMAGE_FALLBACK}</script>${styles}`
    +`<script async="" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>`
    +`<title>${esc(title)}</title><meta name="description" content="${DESC}"/><meta name="robots" content="${index?'index':'noindex'}, follow"/>`
    +`<link rel="canonical" href="${url}"/><link rel="alternate" type="application/rss+xml" href="${ORIGIN}/rss.xml"/><meta name="naver-site-verification" content="${NAVER}"/>`
    +`<meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${DESC}"/><meta property="og:url" content="${url}"/><meta property="og:site_name" content="내근처 여행"/><meta property="og:locale" content="ko_KR"/><meta property="og:type" content="website"/><meta property="og:image" content="${esc(image)}"/>`
    +`<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="${esc(image)}"/><meta name="twitter:title" content="${esc(title)}"/><meta name="twitter:description" content="${DESC}"/><link rel="icon" href="/icon.svg"/><link rel="apple-touch-icon" href="/apple-touch-icon.png"/><link rel="manifest" href="/manifest.webmanifest"/><script>${clarity}</script></head>`
    // Not hydrated (no Next.js runtime): fill the manual ad slots here.
    +`<body>${body}<script>document.querySelectorAll('ins.adsbygoogle').forEach(function(){try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(e){}});</script><script>${PARKING_NEAR}</script></body></html>`;
}
