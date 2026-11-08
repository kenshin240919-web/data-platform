// Shared by the static pages, the browser and the Worker (no imports): labels, links and the store shape.
export const SITE='https://cvs.guidejung.com';
export const BRAND='내근처 편의점';
export const TAGLINE='밤에도 상비약 어디서?';
export const PHARMACY='https://pharmacy.guidejung.com';
export const HOSPITAL='https://hospital.guidejung.com';
/** 광고 스위치: false로 바꿔 main에 push하면 이 사이트만 광고가 빠짐. */
export const ADS=true;
/** 상세 사이트맵 단계(collect-cvs.py stage_of): 1 = 전화번호가 있거나 1km 안에 약국이 없는 곳, 2 = 전체. 숫자만 올리면 다음 단계. */
export const SITEMAP_STAGE=1;

export type BrandKey='cu'|'gs25'|'seven'|'emart24'|'ministop'|'other';
type Ref={id:string;name:string;m:number};
/** LOCALDATA 안전상비의약품 판매업소 원문(이름·주소·전화·등록일·영업 면적) + 수집기가 붙인 주변 정보. region: weather 시군구 코드. */
export type Store={id:string;brand:BrandKey;name:string;addr?:string|null;jibun?:string|null;lat?:number|null;lon?:number|null;tel?:string|null;
  since?:string|null;area?:number|null;region:string;region_name:string;stage?:number;
  ph?:Ref&{close?:number|null;sun?:boolean};ph_n?:number;ph_late?:Ref&{close:number};er?:Ref;n500?:number};
// 브랜드는 상호로 나눈 것(공식 가맹점 목록이 아님). 로고·색은 쓰지 않음 — 이름만.
export const BRANDS:Record<BrandKey,{label:string;title:string}>={
  cu:{label:'CU',title:'CU'},
  gs25:{label:'GS25',title:'GS25'},
  seven:{label:'세븐일레븐',title:'세븐일레븐'},
  emart24:{label:'이마트24',title:'이마트24'},
  ministop:{label:'미니스톱',title:'미니스톱'},
  other:{label:'기타',title:'기타 편의점·마트'},
};
export const BRAND_ORDER:BrandKey[]=['cu','gs25','seven','emart24','ministop','other'];
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const storePath=(id:string)=>`/store/${id}`;
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
export const meters=(m:number)=>m<1000?`${m}m`:`${(m/1000).toFixed(1)}km`;
const jong=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28!==0;};
export const eun=(w:string)=>w+(jong(w)?'은':'는');
export const ga=(w:string)=>w+(jong(w)?'이':'가');
/** 2000 → '20:00', 2530 → '다음 날 01:30' */
export const hm=(t?:number|null)=>{if(t==null)return null;const h=Math.floor(t/100),m=t%100;return `${h>=24?'다음 날 ':''}${String(h%24).padStart(2,'0')}:${String(m).padStart(2,'0')}`;};
type Loc={name:string;lat?:number|null;lon?:number|null;addr?:string|null;jibun?:string|null};
export const mapUrl=(p:Loc)=>p.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:`https://map.kakao.com/?q=${encodeURIComponent(p.addr??p.jibun??p.name)}`;
export const telHref=(t:string)=>`tel:${t.replace(/[^0-9]/g,'')}`;
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
export const years=(since?:string|null,now=new Date())=>{if(!since||!/^\d{4}/.test(since))return null;const y=now.getFullYear()-+since.slice(0,4);return y>=1?y:null;};
/** 가장 가까운 약국 한 줄: '○○약국 350m · 평일 20:00까지 · 일요일 휴무' */
export const phLine=(p:Store)=>p.ph?[`${p.ph.name} ${meters(p.ph.m)}`,p.ph.close?`평일 ${hm(p.ph.close)}까지`:null,p.ph.sun?'일요일 영업':'일요일 휴무'].filter(Boolean).join(' · '):null;
/** 브라우저로 보내는 가벼운 카드 */
export const slim=(p:Store)=>({id:p.id,brand:p.brand,name:p.name,addr:p.addr??p.jibun??null,tel:p.tel??null,lat:p.lat??null,lon:p.lon??null,ph:p.ph?{name:p.ph.name,m:p.ph.m}:null});
export type Slim=ReturnType<typeof slim>&{km?:number};
export const COND_MIN=3;
/** 한국 시각 시(0~23)·요일(0=일) — 밤·휴일 문구용 */
export const kst=(d=new Date())=>{const k=new Date(d.getTime()+9*3600e3);return {h:k.getUTCHours(),wd:k.getUTCDay()};};
export const isNight=(d=new Date())=>{const {h}=kst(d);return h>=21||h<8;};
