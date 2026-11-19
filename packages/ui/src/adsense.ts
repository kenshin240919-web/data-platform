// Google AdSense publisher ID shared by every GuideJung subdomain site (not the separate guidejung.com WordPress account setup).
export const ADSENSE_CLIENT='ca-pub-3087515825675332';
// Manual responsive display unit "수동디스플레이광고".
export const DISPLAY_SLOT='6639512269';
// 11/19: Worker 상세 페이지(React 없음)에서 수동 광고 칸 채우기 — 12개 Worker에 복사돼 있던 것을 한 곳으로.
// 전에는 칸마다 바로 push해 너비 0인 칸(숨은 칸·화면 밖에서 미리 연 페이지)에서 애드센스가 'No slot size for availableWidth=0'
// 오류를 냄(Clarity 스크립트 오류) → ads.tsx와 같게 너비가 생길 때까지 기다렸다가 한 번만 채움.
export const AD_FILL='<script>(function(){function f(el){var d=0,ro;function go(){if(d||!el.offsetWidth)return;d=1;if(ro)ro.disconnect();try{(window.adsbygoogle=window.adsbygoogle||[]).push({})}catch(e){}}ro=window.ResizeObserver?new ResizeObserver(go):null;if(ro)ro.observe(el);go()}try{document.querySelectorAll("ins.adsbygoogle:not([data-adsbygoogle-status])").forEach(f)}catch(e){}})()</script>';
