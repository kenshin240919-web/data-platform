// 공유·즐겨찾기 버튼. 정적 페이지(React <Actions>, favlist.tsx)와 Worker 상세(actionsHtml 문자열)가 같은 표시를 쓰고,
// 동작은 모든 페이지 맨 위 NetworkBar에 들어 있는 ACTIONS_JS 하나가 맡는다(Worker 상세는 하이드레이션이 없어서).
// 즐겨찾기는 이 브라우저(localStorage gj.fav, 사이트마다 따로)에만 저장한다.
import {KAKAO_JS_KEY} from './live';
export type FavInfo={id:string;name:string;sub?:string;url:string};
const attr=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));

export function actionsHtml(fav?:FavInfo){
  return `<div class="gj-actions">${KAKAO_JS_KEY?'<button type="button" class="gj-kakao">💬 카카오톡 공유</button>':''}<button type="button" class="gj-share">📤 공유하기</button>${fav?`<button type="button" class="gj-fav" data-id="${attr(fav.id)}" data-name="${attr(fav.name)}" data-sub="${attr(fav.sub??'')}" data-url="${attr(fav.url)}"><span class="on">★ 즐겨찾기됨</span><span class="off">☆ 즐겨찾기</span></button>`:''}</div>`;
}
/** 공유: 휴대폰은 기본 공유 창(카카오톡 등), 아니면 링크 복사. 즐겨찾기: 누를 때마다 넣고 빼기, 최대 20곳. GA 이벤트 share·favorite. */
export const ACTIONS_JS=`(function(){if(window.__gjAct)return;window.__gjAct=1;var K='gj.fav';
function L(){try{return JSON.parse(localStorage.getItem(K)||'[]')}catch(e){return[]}}
function S(v){try{localStorage.setItem(K,JSON.stringify(v.slice(0,20)))}catch(e){}try{window.dispatchEvent(new Event('gj-fav'))}catch(e){}}
function mark(){var ids={};L().forEach(function(f){ids[f.id]=1});document.querySelectorAll('.gj-fav').forEach(function(b){if(ids[b.getAttribute('data-id')])b.setAttribute('data-on','1');else b.removeAttribute('data-on')})}
function ga(n,p){try{window.gtag&&window.gtag('event',n,p)}catch(e){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mark);else mark();
document.addEventListener('click',function(e){var t=e.target,b=t&&t.closest&&t.closest('.gj-share,.gj-fav');if(!b)return;e.preventDefault();
if(b.classList.contains('gj-fav')){var id=b.getAttribute('data-id'),v=L(),i=v.findIndex(function(f){return f.id===id});
if(i>=0){v.splice(i,1);ga('favorite',{action:'remove',item_id:id})}else{v.unshift({id:id,name:b.getAttribute('data-name'),sub:b.getAttribute('data-sub')||'',url:b.getAttribute('data-url'),at:Date.now()});ga('favorite',{action:'add',item_id:id})}
S(v);mark();return}
var u=location.href.split('#')[0],d=document.querySelector('meta[name=description]'),x=d?d.getAttribute('content'):'';
ga('share',{method:navigator.share?'native':'copy',item_id:location.pathname});
if(navigator.share){navigator.share({title:document.title,text:x,url:u}).catch(function(){});return}
var o=b.textContent,ok=function(){b.textContent='✅ 링크를 복사했어요';setTimeout(function(){b.textContent=o},1800)},no=function(){window.prompt('이 주소를 복사하세요',u)};
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(u).then(ok,no);else no()})})();`;
