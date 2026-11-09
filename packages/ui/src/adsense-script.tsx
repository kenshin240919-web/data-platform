import {ADSENSE_CLIENT} from './adsense';
// Auto ads loader; ad formats (anchor, side rail, vignette, in-page) are switched on in the AdSense dashboard, not here.
// 11/9: 내 컴퓨터·시험 화면(localhost·127.0.0.1·사설망 주소)에서는 광고 코드를 아예 불러오지 않음 — 애드센스 보고서에 127.0.0.1 조회가 잡혀
// 통계가 섞이고 무효 트래픽으로 보일 수 있었음. 실제 사이트에서는 전과 같이 <head>에서 바로 불러옴.
export const ADS_LOCAL_RE='^(localhost|127\\.|0\\.0\\.0\\.0|10\\.|192\\.168\\.|\\[::1\\])|\\.local$';
export const adsLoaderJs=(client=ADSENSE_CLIENT)=>`(function(h){if(new RegExp(${JSON.stringify(ADS_LOCAL_RE)}).test(h))return;var s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}';document.head.appendChild(s);})(location.hostname);`;
export function AdSenseScript(){return <script dangerouslySetInnerHTML={{__html:adsLoaderJs()}}/>;}
