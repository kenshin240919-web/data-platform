// Shared by the static pages, the browser and the Worker (no imports): labels, hours / fine logic and the place shape.
export const SITE='https://service.guidejung.com';
export const BRAND='내근처 서비스센터';
export const TAGLINE='고장 났다, 어디로 가지?';

export type Kind='repair'|'inspect'|'wash'|'emission';
type HM=[string,string];
/** hours: wk(평일)·sat(토)·hol(일요일·공휴일) → ['09:00','18:00'] — 원본에 있는 것만. region: weather 시군구 코드. */
export type Center={id:string;kind:Kind;name:string;sub:string|null;addr:string|null;jibun:string|null;lat:number|null;lon:number|null;tel:string|null;
  hours:{wk?:HM;sat?:HM;hol?:HM};hours_text?:string|null;since:string|null;tags:string[];fee:string|null;off:string|null;org:string|null;ref:string|null;region:string;region_name:string;
  /** scripts/collect-service.py enrich: 1km 안 정비소(r)·그중 종합·소형(b)·세차장(w), 가장 가까운 검사소·공영주차장, 사이트맵 단계 */
  around?:{r:number;b:number;w:number};insp?:{id:string;m:number};park?:{id:string;name:string;m:number;free:boolean};stage?:number};
/** 시군구×종류 통계(region_stats): 등록 연도·평일 마감(분) 사분위, 시간 등록 수, 토·일요일 시간 등록 수, 종합·소형 정비소 수 */
export type KindStats={n:number;y25?:number;y50?:number;y75?:number;hours:number;c25?:number;c50?:number;c75?:number;sat:number;hol:number;big?:number};
export const KINDS:Record<Kind,{label:string;icon:string;title:string;desc:string;ld:string}>={
  repair:{label:'정비소',icon:'🔧',title:'자동차 정비소',desc:'종합·소형·전문 정비업체(카센터·공업사)',ld:'AutoRepair'},
  inspect:{label:'검사소',icon:'🔍',title:'자동차 검사소',desc:'정기·종합검사를 받는 곳(공단·민간 지정)',ld:'AutomotiveBusiness'},
  wash:{label:'세차장',icon:'🧽',title:'세차장',desc:'지자체에 등록된 세차장',ld:'AutoWash'},
  emission:{label:'배출가스 정비',icon:'💨',title:'배출가스 정비',desc:'배출가스 전문정비·확인검사대행',ld:'AutoRepair'},
};
export const KIND_ORDER:Kind[]=['repair','inspect','wash','emission'];
/** 정비업 종류 설명(자동차관리법 기준, reports/service-설계안 0-1) */
export const REPAIR_INFO:Record<string,string>={
  '종합정비':'모든 종류의 자동차를 점검·정비할 수 있는 곳(흔히 1급 공업사)',
  '소형자동차종합정비':'승용차와 경형·소형 승합·화물차를 종합 정비하는 곳(흔히 2급)',
  '전문정비':'정해진 범위의 장치만 정비하는 곳(흔히 카센터·3급)',
  '원동기전문정비':'엔진(원동기) 재생 정비를 하는 곳',
};
export const HOLIDAYS=new Set([
  '20260101','20260216','20260217','20260218','20260301','20260302','20260505','20260524','20260525','20260603','20260606','20260815','20260817',
  '20260924','20260925','20260926','20261003','20261005','20261009','20261225',
  '20270101','20270206','20270207','20270208','20270209','20270301','20270505','20270513','20270606','20270815','20270816','20270914','20270915','20270916',
  '20271003','20271004','20271009','20271011','20271225','20271227',
]);
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const centerPath=(id:string)=>`/center/${id}`;
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
const jong=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28!==0;};
export const eun=(w:string)=>w+(jong(w)?'은':'는');
export const ga=(w:string)=>w+(jong(w)?'이':'가');
/** 한국 시각 {ymd, kind: wk|sat|hol, min} (일요일은 공휴일로 봄) */
export function kstNow(now=Date.now()){
  const d=new Date(now+9*3600e3);const ymd=d.toISOString().slice(0,10).replace(/-/g,''),dow=d.getUTCDay();
  return {ymd,kind:(HOLIDAYS.has(ymd)||dow===0?'hol':dow===6?'sat':'wk') as 'wk'|'sat'|'hol',min:d.getUTCHours()*60+d.getUTCMinutes()};
}
export const KIND_LABEL={wk:'평일',sat:'토요일',hol:'일요일·공휴일'} as const;
const mins=(s:string)=>+s.slice(0,2)*60+ +s.slice(3,5);
/** 지금 운영 중인지 — 원본에 시간이 없으면 null(추정하지 않음). 정비소·세차장은 평일 시간만 있는 곳이 많아 그 요일만 판단. */
export function openNow(p:Pick<Center,'hours'>,now=kstNow()):{open:boolean;label:string}|null{
  if(!p.hours.wk&&!p.hours.sat&&!p.hours.hol)return null;
  const h=p.hours[now.kind];
  if(!h)return now.kind==='wk'?null:{open:false,label:`${KIND_LABEL[now.kind]} 시간 정보 없음`};
  const s=mins(h[0]);let e=mins(h[1]);if(e<=s)e+=1440;
  return now.min>=s&&now.min<e?{open:true,label:`영업 중 · ${h[1]}까지`}:{open:false,label:now.min<s?`${h[0]}부터 영업`:'오늘 영업 끝'};
}
export function hoursLine(p:Pick<Center,'hours'>){
  const parts=(['wk','sat','hol'] as const).filter(k=>p.hours[k]).map(k=>`${{wk:'평일',sat:'토',hol:'휴일'}[k]} ${p.hours[k]![0]}~${p.hours[k]![1]}`);
  return parts.length?parts.join(' · '):'운영 시간 정보 없음';
}
export const mapUrl=(p:Pick<Center,'name'|'lat'|'lon'|'addr'|'jibun'>)=>p.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:`https://map.kakao.com/?q=${encodeURIComponent(p.addr??p.jibun??p.name)}`;
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
/** 'yyyy-mm-dd' 등록일 → 영업 햇수 */
export const years=(since:string|null,now=new Date())=>{if(!since||!/^\d{4}/.test(since))return null;const y=now.getFullYear()-+since.slice(0,4);return y>=1?y:null;};
/** 정기검사 지연 과태료(여러 자료 공통 설명 기준, 추정): 검사 기간이 끝난 뒤 30일 이내 4만 원, 이후 3일마다 2만 원 추가, 최대 60만 원. */
export const fineFor=(daysLate:number)=>daysLate<=0?0:daysLate<=30?40000:Math.min(600000,40000+20000*(Math.floor((daysLate-31)/3)+1));
/** 브라우저로 보내는 가벼운 카드 */
export const slim=(p:Center)=>({id:p.id,kind:p.kind,name:p.name,sub:p.sub,addr:p.addr??p.jibun,tel:p.tel,lat:p.lat,lon:p.lon,hours:p.hours,tags:p.tags,since:p.since});
export type Slim=ReturnType<typeof slim>&{km?:number};
export const COND_MIN=3;
