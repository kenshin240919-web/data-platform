// Shared by the static pages, the browser and the Worker (no imports): labels, links and the theater shape.
export const SITE='https://movie.guidejung.com';
export const BRAND='내근처 영화관';
export const TAGLINE='지금 뭐 볼 수 있어?';
export const PARKING='https://parking.guidejung.com';
export const TRIP='https://trip.guidejung.com';
/** 광고 스위치: false로 바꿔 main에 push하면 이 사이트만 광고가 빠짐. */
export const ADS=true;
/** KOBIS 저장·게시 사전 승낙(11/9 문의 중). 승낙 전에는 false — 영화 정보·박스오피스는 방문 때만 보여 주고 저장·정적 페이지 없음(약관 제6조 ②). */
export const KOBIS_STORE=false;

export type ChainKey='cgv'|'lotte'|'mega'|'cineq'|'indie';
type Ref={id:string;name:string;m:number};
/** LOCALDATA 문화_영화상영관(상영관 단위)을 극장으로 묶은 것 + 수집기가 붙인 주변 정보. region: weather 시군구 코드. */
export type Theater={id:string;chain:ChainKey;name:string;addr?:string|null;jibun?:string|null;lat?:number|null;lon?:number|null;tel?:string|null;
  since?:string|null;screens:number;special?:string[];drive?:boolean;region:string;region_name:string;
  park?:Ref&{free:boolean;n:number};near?:Ref;n5?:number};
// 체인은 인허가 상호로 나눈 것(본사 공식 목록이 아님). 로고·색은 쓰지 않음 — 이름만.
export const CHAINS:Record<ChainKey,{label:string;title:string}>={
  cgv:{label:'CGV',title:'CGV'},
  lotte:{label:'롯데시네마',title:'롯데시네마'},
  mega:{label:'메가박스',title:'메가박스'},
  cineq:{label:'씨네Q',title:'씨네Q'},
  indie:{label:'작은·독립',title:'작은 영화관·독립 영화관'},
};
export const CHAIN_ORDER:ChainKey[]=['cgv','lotte','mega','cineq','indie'];
/** 실시간 시간표·남은 좌석을 받을 수 있는 체인(공개 중계 aka.page 기준, 메가박스는 자주 시간 초과). */
export const LIVE_CHAINS:ChainKey[]=['cgv','lotte','mega'];
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const theaterPath=(id:string)=>`/theater/${id}`;
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
export const meters=(m:number)=>m<1000?`${m}m`:`${(m/1000).toFixed(1)}km`;
const jong=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28!==0;};
export const eun=(w:string)=>w+(jong(w)?'은':'는');
export const ga=(w:string)=>w+(jong(w)?'이':'가');
type Loc={name:string;lat?:number|null;lon?:number|null;addr?:string|null;jibun?:string|null};
export const mapUrl=(p:Loc)=>p.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:`https://map.kakao.com/?q=${encodeURIComponent(p.addr??p.jibun??p.name)}`;
export const telHref=(t:string)=>`tel:${t.replace(/[^0-9]/g,'')}`;
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
export const years=(since?:string|null,now=new Date())=>{if(!since||!/^\d{4}/.test(since))return null;const y=now.getFullYear()-+since.slice(0,4);return y>=1?y:null;};
/** 브라우저로 보내는 가벼운 카드 */
export const slim=(p:Theater)=>({id:p.id,chain:p.chain,name:p.name,addr:p.addr??p.jibun??null,tel:p.tel??null,lat:p.lat??null,lon:p.lon??null,screens:p.screens,special:p.special??[],drive:!!p.drive});
export type Slim=ReturnType<typeof slim>&{km?:number};
/** 실시간 상영 한 회차(aka.page 응답을 Worker가 줄인 것) */
export type Show={movie:string;start:string;end?:string|null;left?:number|null;total?:number|null;screen?:string|null};
/** 한국 시각 'HH:MM' */
export const kstHm=(d=new Date())=>{const k=new Date(d.getTime()+9*3600e3);return `${String(k.getUTCHours()).padStart(2,'0')}:${String(k.getUTCMinutes()).padStart(2,'0')}`;};
/** 'HH:MM' 두 개의 분 차이(b-a). 새벽 회차(24:10 등)도 숫자 그대로 비교. */
export const minDiff=(a:string,b:string)=>{const f=(s:string)=>+s.slice(0,2)*60+ +s.slice(3,5);return f(b)-f(a);};
export const seatTag=(s:Show)=>s.left==null?null:s.left===0?'매진':s.total&&s.left/s.total<=0.1?`${s.left}석 남음`:`${s.left}석`;
