// Google AdSense publisher ID shared by every GuideJung subdomain site (not the separate guidejung.com WordPress account setup).
export const ADSENSE_CLIENT='ca-pub-3087515825675332';
// Manual responsive display unit "수동디스플레이광고".
export const DISPLAY_SLOT='6639512269';
// 11/19: Worker 상세 페이지(React 없음)에서 수동 광고 칸 채우기 — 12개 Worker에 복사돼 있던 것을 한 곳으로.
// 전에는 칸마다 바로 push해 너비 0인 칸(숨은 칸·화면 밖에서 미리 연 페이지)에서 애드센스가 'No slot size for availableWidth=0'
// 오류를 냄(Clarity 스크립트 오류) → ads.tsx와 같게 너비가 생길 때까지 기다렸다가 한 번만 채움.
export const AD_FILL='<script>(function(){function f(el){var d=0,ro;function go(){if(d||!el.offsetWidth)return;d=1;if(ro)ro.disconnect();try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(e){}}ro=window.ResizeObserver?new ResizeObserver(go):null;if(ro)ro.observe(el);go()}try{document.querySelectorAll("ins.adsbygoogle:not([data-adsbygoogle-status])").forEach(f)}catch(e){}})()</script>';
// 11/21: 주유소·학원·정비소·학교·서류는 구글 자동광고가 본문에 한 칸도 안 붙어(병원·시장·일자리는 7~8칸) 쪽당 노출이 수동 칸 1개뿐 →
// Worker 상세 페이지 본문 중간(세 번째 <section> 앞)에 수동 칸 하나를 더 넣음. 채우기는 AD_FILL이 함께 함.
export const AD_SLOT_HTML=`<aside class="ad-slot" aria-label="광고"><span class="ad-label">광고</span><ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${DISPLAY_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins></aside>`;
export const withMidAd=(body:string,n=3)=>{let i=-1;for(let k=0;k<n;k++){i=body.indexOf('<section',i+1);if(i<0)return body;}return body.slice(0,i)+AD_SLOT_HTML+body.slice(i);};
