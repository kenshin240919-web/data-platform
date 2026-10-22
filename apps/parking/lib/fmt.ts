// Shared by the static pages, the browser and the Worker (no imports): labels, fee / opening-hours logic and the lot shape.
export const SITE='https://parking.guidejung.com';
export const BRAND='내근처 주차장';
export const TAGLINE='여기 주차 어디 해?';

/** fee.b: [기본 분, 기본 원], a: [추가 단위 분, 추가 단위 원], d: 1일권 원, dh: 1일권 적용 시간, m: 월 정기권 원.
 *  hours: wk(평일)·sat(토)·hol(공휴일) → ['09:00','18:00'] (운영 요일에 없으면 빠짐). region: weather 시군구 코드. */
export type Fee={b?:[number,number];a?:[number,number];d?:number;dh?:number;m?:number};
export type Lot={id:string;name:string;se:string|null;type:string|null;addr:string|null;jibun:string|null;spaces:number|null;lat:number|null;lon:number|null;
  charge:'무료'|'유료'|'혼합';fee:Fee|null;days:string|null;hours:{wk?:[string,string];sat?:[string,string];hol?:[string,string]};pay:string|null;note:string|null;
  org:string|null;tel:string|null;dis:boolean;ref:string|null;region:string;region_name:string};
export type Card=Lot&{km?:number};

// 공휴일(대체공휴일 포함) — 약국 사이트와 같은 표. 해가 바뀌기 전에 다음 해를 추가해야 함.
export const HOLIDAYS=new Set([
  '20260101','20260216','20260217','20260218','20260301','20260302','20260505','20260524','20260525','20260603','20260606','20260815','20260817',
  '20260924','20260925','20260926','20261003','20261005','20261009','20261225',
  '20270101','20270206','20270207','20270208','20270209','20270301','20270505','20270513','20270606','20270815','20270816','20270914','20270915','20270916',
  '20271003','20271004','20271009','20271011','20271225','20271227',
]);
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const won=(v:number)=>v===0?'무료':`${n(v)}원`;
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const lotPath=(id:string)=>`/parking/${id}`;
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
/** 은/는 · 이/가 */
const jong=(w:string)=>{const t=w.trim(),c=(t[t.length-1]??'').charCodeAt(0)-0xac00;return c>=0&&c<11172&&c%28!==0;};
export const eun=(w:string)=>w+(jong(w)?'은':'는');
export const ga=(w:string)=>w+(jong(w)?'이':'가');

/** 주차 시간 칩 */
export const DURATIONS=[[30,'30분'],[60,'1시간'],[120,'2시간'],[240,'4시간']] as const;
export const dur=(m:number)=>m<60?`${m}분`:m%60?`${Math.floor(m/60)}시간 ${m%60}분`:`${m/60}시간`;
/** 예상 요금(원). 무료 0, 계산할 수 없으면 null. 기본시간을 넘으면 추가 단위로 올림, 1일권이 있으면 그 이하. */
export function feeFor(p:Pick<Lot,'charge'|'fee'>,mins:number):number|null{
  if(p.charge==='무료')return 0;
  const f=p.fee;if(!f?.b)return null;
  const [bt,bw]=f.b;let w=bw;
  if(mins>bt){if(!f.a)return f.d??null;w+=Math.ceil((mins-bt)/f.a[0])*f.a[1];}
  return f.d&&w>f.d&&(!f.dh||mins<=f.dh*60)?f.d:w;
}
/** '30분 500원 · 추가 10분당 200원 · 1일 10,000원' */
export function feeLine(p:Pick<Lot,'charge'|'fee'>){
  if(p.charge==='무료')return '무료';
  const f=p.fee;if(!f)return p.charge==='혼합'?'일부 무료 · 요금 확인 필요':'유료 · 요금 확인 필요';
  return [f.b&&`${dur(f.b[0])} ${n(f.b[1])}원`,f.a&&`추가 ${dur(f.a[0])}당 ${n(f.a[1])}원`,f.d&&`1일 ${n(f.d)}원`,!f.b&&f.m&&`월 정기권 ${n(f.m)}원`].filter(Boolean).join(' · ')||'요금 확인 필요';
}
const ALL=(h?:[string,string])=>!!h&&h[0]==='00:00'&&(h[1]==='23:59'||h[1]==='24:00');
/** 평일·토·공휴일 모두 0시~24시 */
export const allDay=(p:Pick<Lot,'hours'>)=>ALL(p.hours.wk)&&ALL(p.hours.sat)&&ALL(p.hours.hol);
export const CONDITIONS={free:{label:'무료',title:'무료 주차장',test:(p:Lot)=>p.charge==='무료',desc:'요금이 무료인'},
  allday:{label:'24시간',title:'24시간 주차장',test:allDay,desc:'평일·주말·공휴일 24시간 운영하는'}} as const;
export type Cond=keyof typeof CONDITIONS;
/** 지역×조건 페이지를 만드는 최소 주차장 수(내용이 너무 적은 페이지는 만들지 않음) */
export const COND_MIN=3;
/** 한국 시각 {ymd, kind: wk|sat|hol, min} (일요일은 공휴일 시간으로 봄) */
export function kstNow(now=Date.now()){
  const d=new Date(now+9*3600e3);const ymd=d.toISOString().slice(0,10).replace(/-/g,''),dow=d.getUTCDay();
  return {ymd,kind:(HOLIDAYS.has(ymd)||dow===0?'hol':dow===6?'sat':'wk') as 'wk'|'sat'|'hol',min:d.getUTCHours()*60+d.getUTCMinutes()};
}
const mins=(s:string)=>+s.slice(0,2)*60+ +s.slice(3,5);
export const KIND_LABEL={wk:'평일',sat:'토요일',hol:'일요일·공휴일'} as const;
/** 지금 운영 중인지(등록된 시간 기준). */
export function openNow(p:Pick<Lot,'hours'>,now=kstNow()):{open:boolean;label:string}{
  const h=p.hours[now.kind];
  if(!h)return {open:false,label:`${KIND_LABEL[now.kind]} 운영 안 함`};
  if(ALL(h))return {open:true,label:'24시간'};
  const s=mins(h[0]);let e=mins(h[1]);if(e<=s)e+=1440;
  const t=now.min<s&&e>1440&&now.min+1440<e?now.min+1440:now.min;
  return t>=s&&t<e?{open:true,label:`운영 중 · ${h[1]}까지`}:{open:false,label:now.min<s?`${h[0]}부터 운영`:'오늘 운영 끝'};
}
/** '평일 09:00~18:00 · 토 09:00~13:00 · 공휴일 운영 안 함' / '24시간' */
export function hoursLine(p:Pick<Lot,'hours'>){
  if(allDay(p))return '24시간';
  const one=(k:'wk'|'sat'|'hol',l:string)=>{const h=p.hours[k];return `${l} ${h?ALL(h)?'24시간':`${h[0]}~${h[1]}`:'운영 안 함'}`;};
  return [one('wk','평일'),one('sat','토'),one('hol','공휴일')].join(' · ');
}
export const mapUrl=(p:Pick<Lot,'name'|'lat'|'lon'|'addr'|'jibun'>)=>p.lat!=null?`https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lon}`:`https://map.kakao.com/?q=${encodeURIComponent(p.addr??p.jibun??p.name)}`;
export const distKm=(aLat:number,aLon:number,bLat:number,bLon:number)=>{const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));};
/** 브라우저로 보내는 가벼운 카드 */
export const slim=(p:Lot)=>({id:p.id,name:p.name,type:p.type,se:p.se,addr:p.addr??p.jibun,spaces:p.spaces,lat:p.lat,lon:p.lon,charge:p.charge,fee:p.fee,hours:p.hours});
export type Slim=ReturnType<typeof slim>&{km?:number};
