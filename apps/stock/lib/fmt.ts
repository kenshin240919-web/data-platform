// Shared by the static pages, the browser and the Worker (no imports): labels, links and shapes.
export const SITE='https://stock.guidejung.com';
export const BRAND='내근처 재고';
export const TAGLINE='그거 근처 매장에 있어?';
/** 광고 스위치: false로 바꿔 main에 push하면 이 사이트만 광고가 빠짐. */
export const ADS=true;
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
export const won=(v:number)=>`${n(v)}원`;
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
export const telHref=(t:string)=>`tel:${t.replace(/[^0-9]/g,'')}`;
export const mapTo=(name:string,lat:number,lon:number)=>`https://map.kakao.com/link/to/${encodeURIComponent(name)},${lat},${lon}`;
/** Worker가 브라우저로 보내는 모양(중계 응답을 줄인 것 — 저장하지 않음). */
export type Product={id:string;name:string;price:number|null;soldOut:boolean;isNew:boolean};
export type Store={code:string;name:string;addr:string;tel:string|null;open:string|null;close:string|null;lat:number;lon:number;qty:number|null;parking:boolean;pickup:boolean};
export type StockRes={product:{id:string;name:string}|null;online:number|null;total:number;inStock:number;unknown:number;stores:Store[]};
/** 한국 시각 'HH:MM' */
export const kstHm=(d=new Date())=>{const k=new Date(d.getTime()+9*3600e3);return `${String(k.getUTCHours()).padStart(2,'0')}:${String(k.getUTCMinutes()).padStart(2,'0')}`;};
export const openNow=(s:Store,now=kstHm())=>!s.open||!s.close?null:s.close>s.open?now>=s.open&&now<s.close:now>=s.open||now<s.close;
