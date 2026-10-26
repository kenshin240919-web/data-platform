// Shared by the static pages, the browser and the Worker: labels, links and the place shape.
// 동물약국 영업 시간은 약국 사이트와 같은 계산(apps/pharmacy/lib/fmt.ts statusOf — 공휴일 표 HOLIDAYS도 그쪽 하나만 고침).
import {kstNow,statusOf,weekLine,type Status} from '../../pharmacy/lib/fmt';
export {kstNow,statusOf,weekLine,type Status};
export const SITE='https://pet.guidejung.com';
export const BRAND='내근처 동물병원';
export const TAGLINE='우리 아이 아플 때 어디로?';
export const PHARMACY_SITE='https://pharmacy.guidejung.com';

export type Kind='hospital'|'pharmacy'|'hotel'|'cafe'|'taxi';
export type Hours=Record<string,[string,string]>;
/** LOCALDATA 인허가 원문: 이름·주소·전화·인허가일. 동물병원 진료 시간은 공공데이터에 없음(지어내지 않음 — '24시'는 이름 기준).
 * hours·ph: 동물약국 중 약국 사이트 데이터(국립중앙의료원)와 맞춘 곳만. region: weather 시군구 코드. */
export type Place={id:string;kind:Kind;name:string;sub:string|null;addr:string|null;jibun:string|null;lat:number|null;lon:number|null;tel:string|null;
  since:string|null;tags:string[];ref:string|null;region:string;region_name:string;hours?:Hours;ph?:string};
export const KINDS:Record<Kind,{label:string;icon:string;title:string;desc:string;ld:string;src:string}>={
  hospital:{label:'동물병원',icon:'🏥',title:'동물병원',desc:'시·군·구에 개설 신고한 동물병원(24시는 이름 기준)',ld:'VeterinaryCare',src:'동물병원'},
  pharmacy:{label:'동물약국',icon:'💊',title:'동물약국',desc:'동물용 의약품 판매를 신고한 약국 — 지금 문 연 곳부터',ld:'Pharmacy',src:'동물약국'},
  hotel:{label:'펫호텔·유치원',icon:'🏨',title:'펫호텔·유치원',desc:'동물위탁관리업으로 등록한 펫호텔·애견 유치원',ld:'LocalBusiness',src:'동물위탁관리업'},
  cafe:{label:'애견·고양이 카페',icon:'☕',title:'애견·고양이 카페',desc:'동물전시업으로 등록한 애견·고양이 카페와 동물 체험 시설',ld:'LocalBusiness',src:'동물전시업'},
  taxi:{label:'펫택시',icon:'🚕',title:'펫택시',desc:'동물운송업으로 등록한 반려동물 운송 업체',ld:'LocalBusiness',src:'동물운송업'},
};
export const KIND_ORDER:Kind[]=['hospital','pharmacy','hotel','cafe','taxi'];
export const is24=(p:{sub:string|null})=>p.sub==='24시';
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const placePath=(id:string)=>`/place/${id}`;
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
const jong=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28!==0;};
export const eun=(w:string)=>w+(jong(w)?'은':'는');
export const ga=(w:string)=>w+(jong(w)?'이':'가');
/** 으로/로 (ㄹ 받침은 '로') */
export const ro=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return w+(c>=0&&c<11172&&c%28!==0&&c%28!==8?'으로':'로');};
type Loc={name:string;lat?:number|null;lon?:number|null;addr?:string|null;jibun?:string|null};
export const mapUrl=(p:Loc)=>p.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:`https://map.kakao.com/?q=${encodeURIComponent(p.addr??p.jibun??p.name)}`;
/** 진료 시간·진료 과목은 공공데이터에 없어 네이버 지도 검색으로 보냄(링크만 — 내용을 가져오지 않음). 이름 + 동네(주소 앞 세 마디). */
export const naverUrl=(p:Loc)=>`https://map.naver.com/p/search/${encodeURIComponent(`${p.name} ${(p.addr??p.jibun??'').split(' ').slice(1,3).join(' ')}`.trim())}`;
export const telHref=(t:string)=>`tel:${t.replace(/[^0-9]/g,'')}`;
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
/** 'yyyy-mm-dd' 인허가일 → 영업 햇수 */
export const years=(since:string|null,now=new Date())=>{if(!since||!/^\d{4}/.test(since))return null;const y=now.getFullYear()-+since.slice(0,4);return y>=1?y:null;};
export const sinceLine=(since:string|null)=>{const y=years(since);return since?(y?`${y}년째`:`${since.slice(0,4)}년 개설`):null;};
/** 동물약국 지금 상태(영업 시간이 있는 곳만). */
export const stateOf=(p:{hours?:Hours})=>p.hours&&Object.keys(p.hours).length?statusOf({hours:p.hours}):null;
/** 지금이 밤(21시~9시)·일요일·공휴일이면 24시 동물병원을 먼저 보여 줌. */
export const offHours=(now=kstNow())=>now.min>=21*60||now.min<9*60||now.day==='7'||now.holiday;
/** 브라우저로 보내는 가벼운 카드 */
export const slim=(p:Place)=>({id:p.id,kind:p.kind,name:p.name,sub:p.sub,addr:p.addr??p.jibun,tel:p.tel,lat:p.lat,lon:p.lon,since:p.since,...(p.hours?{hours:p.hours}:{})});
export type Slim=ReturnType<typeof slim>&{km?:number};
export const COND_MIN=3;
