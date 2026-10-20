// 학원 비교함(로그인 없음): 이 브라우저 localStorage에 학원 id 최대 4곳. Worker 상세 페이지의 인라인 스크립트도 같은 키·이벤트를 씀.
export const COMPARE_KEY='gj.compare',COMPARE_MAX=4,COMPARE_EVENT='gj-compare';
export type Picked={id:string;name:string};
export function readCompare():Picked[]{try{const v=JSON.parse(localStorage.getItem(COMPARE_KEY)??'[]');return Array.isArray(v)?v.slice(0,COMPARE_MAX):[];}catch{return [];}}
function write(v:Picked[]){try{localStorage.setItem(COMPARE_KEY,JSON.stringify(v));}catch{}window.dispatchEvent(new Event(COMPARE_EVENT));}
/** 담기/빼기. 4곳이 차 있으면 false. */
export function toggleCompare(p:Picked){const v=readCompare();const i=v.findIndex(x=>x.id===p.id);
  if(i>=0){v.splice(i,1);write(v);return true;}if(v.length>=COMPARE_MAX)return false;write([...v,p]);return true;}
export function clearCompare(){write([]);}
export function onCompare(f:()=>void){const g=(e:Event)=>{if(e.type===COMPARE_EVENT||(e as StorageEvent).key===COMPARE_KEY)f();};window.addEventListener(COMPARE_EVENT,g);window.addEventListener('storage',g);return ()=>{window.removeEventListener(COMPARE_EVENT,g);window.removeEventListener('storage',g);};}
