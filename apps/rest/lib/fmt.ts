// Shared by the static pages, the browser and the Worker (no imports): labels, links and the place shape.
export const SITE='https://rest.guidejung.com';
export const BRAND='내근처 휴식';
export const TAGLINE='오늘 어디서 쉬지?';
/** 광고 스위치(설계안 10/25 안전장치 ③): false로 바꿔 main에 push하면 이 사이트만 광고가 빠짐(정적 페이지·상세 모두, 다른 사이트는 그대로). */
export const ADS=true;

export type Kind='sauna'|'private'|'anma'|'skin';
/** LOCALDATA 인허가 원문: 이름·주소·전화·인허가일. 가격·예약·영업 시간은 공공데이터에 없음(지어내지 않음). region: weather 시군구 코드. */
export type Place={id:string;kind:Kind;name:string;sub:string|null;addr:string|null;jibun:string|null;lat:number|null;lon:number|null;tel:string|null;
  since:string|null;tags:string[];ref:string|null;region:string;region_name:string};
// 화면 순서(10/25 사용자 결정): 찜질방·사우나 → 1인·프라이빗 → 안마원 → 피부관리. 안마원 쪽에만 '마사지'라는 말을 씀(SEO, 정책).
export const KINDS:Record<Kind,{label:string;icon:string;title:string;desc:string;ld:string;src:string}>={
  sauna:{label:'찜질방·목욕탕',icon:'♨️',title:'찜질방·사우나·목욕탕',desc:'지자체에 신고된 찜질방·한증막·사우나·대중목욕탕',ld:'DaySpa',src:'목욕장업'},
  private:{label:'1인 목욕·세신',icon:'🛁',title:'1인·프라이빗 목욕·세신샵',desc:'혼자 또는 일행끼리 쓰는 1인 목욕탕·프라이빗 사우나·세신샵',ld:'DaySpa',src:'목욕장업·미용업'},
  anma:{label:'안마원',icon:'🙌',title:'안마원·안마시술소',desc:'안마사(시각장애인 안마사 자격)가 개설해 신고한 안마원·안마시술소',ld:'HealthAndBeautyBusiness',src:'의료유사업'},
  skin:{label:'피부관리',icon:'🧴',title:'피부관리실',desc:'피부미용업으로 신고된 피부관리실·왁싱·속눈썹',ld:'BeautySalon',src:'미용업(피부미용업)'},
};
export const KIND_ORDER:Kind[]=['sauna','private','anma','skin'];
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const shopPath=(id:string)=>`/shop/${id}`;
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
const jong=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28!==0;};
export const eun=(w:string)=>w+(jong(w)?'은':'는');
export const ga=(w:string)=>w+(jong(w)?'이':'가');
/** 으로/로 (ㄹ 받침은 '로') */
export const ro=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return w+(c>=0&&c<11172&&c%28!==0&&c%28!==8?'으로':'로');};
type Loc={name:string;lat?:number|null;lon?:number|null;addr?:string|null;jibun?:string|null};
export const mapUrl=(p:Loc)=>p.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:`https://map.kakao.com/?q=${encodeURIComponent(p.addr??p.jibun??p.name)}`;
/** 가격·예약·영업 시간은 공공데이터에 없어 네이버 지도 검색으로 보냄(링크만 — 내용을 가져오지 않음). 이름 + 동네(주소 앞 세 마디). */
export const naverUrl=(p:Loc)=>`https://map.naver.com/p/search/${encodeURIComponent(`${p.name} ${(p.addr??p.jibun??'').split(' ').slice(1,3).join(' ')}`.trim())}`;
export const telHref=(t:string)=>`tel:${t.replace(/[^0-9]/g,'')}`;
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
/** 'yyyy-mm-dd' 인허가일 → 영업 햇수 */
export const years=(since:string|null,now=new Date())=>{if(!since||!/^\d{4}/.test(since))return null;const y=now.getFullYear()-+since.slice(0,4);return y>=1?y:null;};
export const sinceLine=(since:string|null)=>{const y=years(since);return since?(y?`${y}년째 영업`:`${since.slice(0,4)}년 신고`):null;};
/** 브라우저로 보내는 가벼운 카드 */
export const slim=(p:Place)=>({id:p.id,kind:p.kind,name:p.name,sub:p.sub,addr:p.addr??p.jibun,tel:p.tel,lat:p.lat,lon:p.lon,since:p.since});
export type Slim=ReturnType<typeof slim>&{km?:number};
export const COND_MIN=3;
