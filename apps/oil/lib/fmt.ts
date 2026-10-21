// Shared by the static pages, the browser and the Worker (no imports): labels, formatting and the station shape.
export const SITE='https://oil.guidejung.com';
export const BRAND='내근처 주유소';
export const TAGLINE='기름값 제일 싼 곳 어디?';

export type Prod='B027'|'D047';
export const PROD_LABEL:Record<Prod,string>={B027:'휘발유',D047:'경유'};
/** prices: 원/L (오피넷 최저가 목록에 들어간 제품만 있음). region: 오피넷 시군구 코드(예: 0113 서울 강남구). */
export type Station={id:string;name:string;brand:string|null;address:string|null;self:boolean;lat:number|null;lon:number|null;region:string|null;prices:Partial<Record<Prod,number|null>>;seen?:string};
/** '20261021' → '10/21' */
export const md=(ymd?:string)=>ymd?`${+ymd.slice(4,6)}/${+ymd.slice(6,8)}`:'';
export type Card=Station&{km?:number};
export type Avg={price:number|null;diff:number|null};

export const n=(v:number)=>v.toLocaleString('ko-KR');
export const won=(v:number|null|undefined)=>v==null?'-':`${Math.round(v).toLocaleString('ko-KR')}원`;
/** +12원 / -8원 / 0원 */
export const diff=(v:number)=>`${v>0?'+':v<0?'−':''}${Math.abs(Math.round(v)).toLocaleString('ko-KR')}원`;
/** 평균 가격 변동(소수 첫째 자리): +0.4원 / 변동 없음 */
export const change=(v:number)=>Math.abs(v)<0.05?'변동 없음':`${v>0?'+':'−'}${Math.abs(v).toFixed(1)}원`;
/** 오피넷 상표 코드 → 이름(모르는 코드는 그대로) */
const BRAND_NAME:Record<string,string>={RTO:'알뜰주유소',RTE:'알뜰주유소',RTX:'고속도로 알뜰',NHO:'농협 알뜰',ETC:'자가상표'};
export const brandName=(b:string|null)=>b?BRAND_NAME[b]??b:null;
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const stationPath=(id:string)=>`/station/${id}`;
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
export const mapUrl=(s:Pick<Station,'name'|'lat'|'lon'>)=>s.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.lat},${s.lon}`:`https://map.kakao.com/link/search/${encodeURIComponent(s.name)}`;
/** 60L 한 번 가득 넣을 때 차이 */
export const tank=(perLiter:number)=>Math.round(perLiter*60);
/** 은/는 */
export const eun=(w:string)=>{const t=w.trim(),last=t[t.length-1]??'';const c=last.charCodeAt(0)-0xac00;return w+(c>=0&&c<11172&&c%28!==0?'은':'는');};
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
