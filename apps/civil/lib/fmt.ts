// Shared by the static pages, the browser and the Worker: labels, links, the place shape and '지금 운영 중'.
// 공휴일 표는 약국 사이트와 같은 것(apps/pharmacy/lib/fmt.ts HOLIDAYS — 해마다 그쪽 하나만 고침).
import {kstNow} from '../../pharmacy/lib/fmt';
export {kstNow};
export const SITE='https://minwon.guidejung.com';
export const BRAND='내근처 서류';
export const TAGLINE='떼고, 뽑고, 부치는 곳';
export const ADS=true;

export type Kind='kiosk'|'office'|'cso'|'passport'|'post';
type Span=[string,string];
/** region: weather 시군구 코드. kiosk: wk(평일)·hol(주말·공휴일) 운영 시각, docs(서류표 번호), a11y(장애인 편의), reg(등기부)·fam(가족관계).
 * cso: 실시간 대기를 주는 시·구청 민원실(stdg·cso로 Worker가 대기 인원 조회). post: mail(우편)·bank(금융) 업무 시간 원문. passport: hours·ext 원문. */
export type Place={id:string;kind:Kind;name:string;addr:string|null;jibun?:string|null;lat:number|null;lon:number|null;region:string;region_name:string;
  org?:string|null;spot?:string|null;at?:string|null;wk?:Span|null;hol?:Span|null;note?:string|null;url?:string|null;a11y?:string[];reg?:boolean;fam?:boolean;docs?:number[];
  zip?:string|null;tel?:string|null;mail?:string|null;bank?:string|null;hours?:string|null;ext?:string|null;stdg?:string|null;cso?:string|null;night?:string|null;weekend?:string|null};
export const KINDS:Record<Kind,{label:string;icon:string;title:string;desc:string;ld:string;src:string}>={
  kiosk:{label:'무인민원발급기',icon:'🖨️',title:'무인민원발급기',desc:'주민등록등본·가족관계증명서 같은 서류를 직접 떼는 기계 — 지금 운영 중인 곳부터',ld:'GovernmentOffice',src:'행정안전부 무인민원발급기 정보'},
  office:{label:'주민센터',icon:'🏢',title:'주민센터·행정복지센터',desc:'읍·면사무소와 동 주민센터(행정복지센터)',ld:'GovernmentOffice',src:'행정안전부 읍면동 하부행정기관 현황'},
  cso:{label:'구청 민원실',icon:'⏱️',title:'시·구청 민원실(실시간 대기)',desc:'지금 기다리는 사람 수를 알려 주는 시·구청 민원실',ld:'GovernmentOffice',src:'행정안전부·한국지역정보개발원 민원실 이용 현황 실시간 정보'},
  passport:{label:'여권 발급',icon:'🛂',title:'여권 발급 기관',desc:'여권을 신청·수령하는 시·군·구청 여권민원실',ld:'GovernmentOffice',src:'외교부 여권사무대행기관 정보'},
  post:{label:'우체국',icon:'📮',title:'우체국',desc:'뗀 서류를 등기·우편으로 부치는 곳 — 우편·금융 업무 시간',ld:'PostOffice',src:'우정사업본부 우체국 정보'},
};
export const KIND_ORDER:Kind[]=['kiosk','office','cso','passport','post'];
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const placePath=(id:string)=>`/place/${id}`;
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
const jong=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28!==0;};
export const eun=(w:string)=>w+(jong(w)?'은':'는');
export const ga=(w:string)=>w+(jong(w)?'이':'가');
export const ro=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return w+(c>=0&&c<11172&&c%28!==0&&c%28!==8?'으로':'로');};
type Loc={name:string;lat?:number|null;lon?:number|null;addr?:string|null;jibun?:string|null};
export const mapUrl=(p:Loc)=>p.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:`https://map.kakao.com/?q=${encodeURIComponent(p.addr??p.jibun??p.name)}`;
export const naverUrl=(p:Loc)=>`https://map.naver.com/p/search/${encodeURIComponent(`${p.name} ${(p.addr??p.jibun??'').split(' ').slice(1,3).join(' ')}`.trim())}`;
export const telHref=(t:string)=>`tel:${t.replace(/[^0-9~-]/g,'').split('~')[0].replace(/-/g,'')}`;
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};

// ---- 지금 운영 중 -------------------------------------------------------------------------------------------------------
const mins=(t:string)=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
/** '09:00~18:00' 같은 원문에서 첫 시간 범위. */
const spanOf=(s?:string|null):Span|null=>{const m=(s??'').match(/(\d{1,2}):?(\d{2})\s*[~\-–]\s*(\d{1,2}):?(\d{2})/);return m?[`${m[1].padStart(2,'0')}:${m[2]}`,`${m[3].padStart(2,'0')}:${m[4]}`]:null;};
/** 오늘 적용되는 운영 시각. 무인민원발급기는 주말·공휴일 시간(hol)이 따로 있고 없으면 쉼. 주민센터는 데이터에 시간이 없어 일반 기준(평일 09~18시). */
export function todaySpan(p:Pick<Place,'kind'|'wk'|'hol'|'mail'|'hours'>,now=kstNow()):{span:Span|null;guess:boolean}{
  const off=now.day==='6'||now.day==='7'||now.holiday;
  if(p.kind==='kiosk')return {span:off?p.hol??null:p.wk??null,guess:false};
  if(p.kind==='cso')return {span:off?null:p.wk??['09:00','18:00'],guess:!p.wk};
  if(p.kind==='post')return {span:off?null:spanOf(p.mail)??['09:00','18:00'],guess:!spanOf(p.mail)};
  if(p.kind==='passport')return {span:off?null:spanOf(p.hours)??['09:00','18:00'],guess:!spanOf(p.hours)};
  return {span:off?null:['09:00','18:00'],guess:true};
}
export type State={state:'open'|'soon'|'closed';label:string;guess:boolean};
export function stateOf(p:Pick<Place,'kind'|'wk'|'hol'|'mail'|'hours'>,now=kstNow()):State{
  const {span,guess}=todaySpan(p,now);
  if(!span)return {state:'closed',label:now.day==='6'||now.day==='7'||now.holiday?'오늘 쉼(주말·공휴일)':'오늘 쉼',guess};
  const b=mins(span[0]),e=mins(span[1])||24*60,t=now.min;
  if(b===0&&e>=24*60)return {state:'open',label:'24시간',guess};
  if(t<b)return {state:'closed',label:`${span[0]}에 열어요`,guess};
  if(t>=e)return {state:'closed',label:`오늘 ${span[1]}까지였어요`,guess};
  return {state:e-t<=30?'soon':'open',label:`${e-t<=30?'곧 닫음 · ':'운영 중 · '}${span[1]}까지`,guess};
}
export const hoursLine=(p:Place)=>p.kind==='kiosk'?[p.wk?`평일 ${p.wk.join('~')}`:'평일 쉼',p.hol?`주말·공휴일 ${p.hol.join('~')}`:'주말·공휴일 쉼'].join(' · ')
  :p.kind==='post'?[p.mail&&`우편 ${p.mail}`,p.bank&&`금융 ${p.bank}`].filter(Boolean).join(' · ')||'평일 09:00~18:00(보통)'
  :p.kind==='passport'?[p.hours,p.ext&&`연장 ${p.ext}`].filter(Boolean).join(' · ')||'평일 09:00~18:00(보통)'
  :p.kind==='cso'?[p.wk?`평일 ${p.wk.join('~')}`:null,p.night&&`야간 ${p.night}`,p.weekend&&`주말 ${p.weekend}`].filter(Boolean).join(' · ')||'평일 09:00~18:00'
  :'평일 09:00~18:00(대부분 — 방문 전 확인)';

/** 브라우저로 보내는 가벼운 카드 */
export const slim=(p:Place)=>({id:p.id,kind:p.kind,name:p.name,addr:p.addr??p.jibun??null,lat:p.lat,lon:p.lon,spot:p.spot??null,at:p.at??null,wk:p.wk??null,hol:p.hol??null,
  mail:p.mail??null,hours:p.hours??null,tel:p.tel??null,docs:p.docs?.length??0,cso:p.cso??null,stdg:p.stdg??null});
export type Slim=ReturnType<typeof slim>&{km?:number};
export const COND_MIN=3;

// ---- 서류 ----------------------------------------------------------------------------------------------------------------
/** 자주 찾는 서류(주소 /doc/{slug}): 서류 이름에 들어가는 낱말로 고름. 수수료는 지자체·발급 방법마다 달라 적지 않음. */
export const DOCS:{slug:string;title:string;q:RegExp;tip:string}[]=[
  {slug:'resident',title:'주민등록등본·초본',q:/^주민등록표(등본|초본)|주민등록등본|주민등록초본/,tip:'본인이 지문을 찍어 바로 뗄 수 있어요. 정부24에서 온라인으로도 뗄 수 있어요.'},
  {slug:'family',title:'가족관계증명서',q:/가족관계증명서/,tip:'가족관계등록부 서류는 발급기에서 ‘가족관계’ 메뉴로 떼요. 일부 발급기는 가족관계 서류를 주지 않아요.'},
  {slug:'basic',title:'기본증명서',q:/기본증명서/,tip:'가족관계등록부 서류예요. 발급기 ‘가족관계’ 메뉴에서 떼요.'},
  {slug:'marriage',title:'혼인관계증명서',q:/혼인관계증명서/,tip:'가족관계등록부 서류예요. 발급기 ‘가족관계’ 메뉴에서 떼요.'},
  {slug:'land',title:'토지(임야)대장',q:/토지.*대장|임야대장/,tip:'토지·임야대장은 부동산 메뉴에서 지번으로 떼요.'},
  {slug:'building',title:'건축물대장',q:/건축물대장/,tip:'건축물대장은 부동산 메뉴에서 주소로 떼요.'},
  {slug:'registry',title:'등기사항증명서(부동산 등기부등본)',q:/등기사항증명서|등기부/,tip:'등기사항증명서는 이 서류를 주는 발급기에서만 떼요(목록에 ‘등기’ 표시).'},
  {slug:'tax',title:'지방세 납세증명서',q:/지방세.*납세|납세증명/,tip:'세금 메뉴에서 떼요.'},
  {slug:'health',title:'건강보험 자격득실 확인서',q:/건강보험.*(자격|득실)|자격득실/,tip:'건강보험 서류는 건강보험 메뉴가 있는 발급기에서만 떼요.'},
  {slug:'school',title:'졸업·재학증명서',q:/졸업증명|재학증명|학교생활기록부|성적증명/,tip:'학교 서류는 학적 메뉴가 있는 발급기에서 떼요.'},
  {slug:'veteran',title:'보훈·국가유공자 확인서',q:/보훈|국가유공자|참전/,tip:'보훈 메뉴에서 떼요.'},
];
