// Google Analytics 4 (gtag.js). One measurement ID (G-…) per site; goes in <head> right after it opens.
// 11/19: Clarity '스크립트 오류'는 문장을 주지 않아 원인을 못 찾음 → 방문자 브라우저의 오류 문장을 GA 이벤트 js_error로(페이지당 5건까지).
// ponytail: 맞춤 측정기준 등록 없이 Data API로 바로 읽으려고 기본 칸 link_text(문장)·link_url(파일:줄)을 빌려 씀 — ga-weekly '스크립트 오류' 표.
const ERR_JS=`(function(){var n=0;function r(m,f,l){if(n++>4)return;try{gtag('event','js_error',{link_text:String(m||'?').slice(0,100),link_url:(String(f||'').split('?')[0]||'(inline)').slice(-90)+':'+(l||0)});}catch(x){}}addEventListener('error',function(e){if(e.target&&e.target!==window)return;r(e.message,e.filename,e.lineno);},true);addEventListener('unhandledrejection',function(e){var x=e.reason;r('promise: '+(x&&x.message||x),'',0);});})();`;
export const gaInline=(id:string)=>`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');${ERR_JS}`;
export function GaScript({id}:{id:string}){
  if(!/^G-[A-Z0-9]+$/.test(id))return null;
  return <><script async src={`https://www.googletagmanager.com/gtag/js?id=${id}`}/><script dangerouslySetInnerHTML={{__html:gaInline(id)}}/></>;
}
