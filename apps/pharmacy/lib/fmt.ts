// Shared by the static pages, the browser and the Worker (no imports): labels, opening-hours logic and the pharmacy shape.
export const SITE='https://pharmacy.guidejung.com';
export const BRAND='내근처 약국';
export const TAGLINE='지금 문 연 약국 어디?';

/** hours: '1'(월) … '7'(일), '8'(공휴일) → ['0900','2100']. 끝이 시작 이하이거나 2400을 넘으면 다음 날 새벽까지. */
export type Pharmacy={id:string;name:string;address:string|null;tel:string|null;lat:number|null;lon:number|null;hours:Record<string,[string,string]>;zip:string|null;region:string;region_name:string};
export type Card=Pharmacy&{km?:number};
export const DAY_LABEL:Record<string,string>={'1':'월','2':'화','3':'수','4':'목','5':'금','6':'토','7':'일','8':'공휴일'};

// 공휴일(대체공휴일 포함). 정부 발표 기준으로 코드에 둠 — 해가 바뀌기 전에 다음 해를 추가해야 함.
export const HOLIDAYS=new Set([
  '20260101','20260216','20260217','20260218','20260301','20260302','20260505','20260524','20260525','20260603','20260606','20260815','20260817',
  '20260924','20260925','20260926','20261003','20261005','20261009','20261225',
  '20270101','20270206','20270207','20270208','20270209','20270301','20270505','20270513','20270606','20270815','20270816','20270914','20270915','20270916',
  '20271003','20271004','20271009','20271011','20271225','20271227',
]);
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const pharmacyPath=(id:string)=>`/pharmacy/${id}`;
/** '0900' → '09:00', '2500' → '다음 날 01:00' */
export const hm=(s:string)=>{const v=+s;const h=Math.floor(v/100)%24,m=v%100;return `${v>=2400?'새벽 ':''}${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;};
const mins=(s:string)=>Math.floor(+s/100)*60+(+s%100);
/** 한국 시각 {ymd:'20261020', day:'2'(월=1…일=7), min: 0시부터 분, holiday} */
export function kstNow(now=Date.now()){
  const d=new Date(now+9*3600e3);const ymd=d.toISOString().slice(0,10).replace(/-/g,'');
  return {ymd,day:String(((d.getUTCDay()+6)%7)+1),min:d.getUTCHours()*60+d.getUTCMinutes(),holiday:HOLIDAYS.has(ymd)};
}
const prevYmd=(ymd:string)=>new Date(Date.UTC(+ymd.slice(0,4),+ymd.slice(4,6)-1,+ymd.slice(6,8))-864e5).toISOString().slice(0,10).replace(/-/g,'');
/** 그날 적용되는 시간(공휴일이면 공휴일 시간, 공휴일 시간이 없으면 쉼으로 봄). */
export function hoursOn(p:{hours:Pharmacy['hours']},day:string,holiday:boolean){return holiday?p.hours['8']??null:p.hours[day]??null;}
const span=(h:[string,string])=>{const s=mins(h[0]);let e=mins(h[1]);if(e<=s)e+=1440;return [s,e] as const;};
export type Status={state:'open'|'soon'|'closed';label:string;today:string|null};
/** 지금 영업 중인지: 오늘 시간 + 어제 밤에 시작해 새벽까지 이어지는 시간. 30분 안에 닫으면 'soon'. */
export function statusOf(p:{hours:Pharmacy['hours']},now=kstNow()):Status{
  const today=hoursOn(p,now.day,now.holiday);
  const y=prevYmd(now.ymd),yDay=String(((+now.day+5)%7)+1),yesterday=hoursOn(p,yDay,HOLIDAYS.has(y));
  const todayLabel=today?`${hm(today[0])}~${hm(today[1])}`:null;
  const check=(h:[string,string]|null,offset:number)=>{if(!h)return null;const [s,e]=span(h);const t=now.min+offset;return t>=s&&t<e?e-t:null;};
  const left=check(today,0)??check(yesterday,1440);
  if(left!=null){const until=today&&check(today,0)!=null?hm(today[1]):yesterday?hm(yesterday[1]):'';return {state:left<=30?'soon':'open',label:left<=30?`${left}분 뒤 닫아요 (${until})`:`영업 중 · ${until}까지`,today:todayLabel};}
  if(today){const [s]=span(today);if(now.min<s)return {state:'closed',label:`오늘 ${hm(today[0])}에 열어요`,today:todayLabel};}
  return {state:'closed',label:today?'오늘 영업 끝':now.holiday?'공휴일 휴무':'오늘 휴무',today:todayLabel};
}
/** 조건: 밤 10시 이후까지(평일 하루라도), 일요일, 공휴일, 토요일. */
export const late=(p:{hours:Pharmacy['hours']})=>['1','2','3','4','5'].some(d=>{const h=p.hours[d];return h&&span(h)[1]>=22*60;});
export const sunday=(p:{hours:Pharmacy['hours']})=>!!p.hours['7'];
export const holidayOpen=(p:{hours:Pharmacy['hours']})=>!!p.hours['8'];
export const saturday=(p:{hours:Pharmacy['hours']})=>!!p.hours['6'];
export const CONDITIONS={night:{label:'밤 10시 이후',title:'심야 약국',test:late,desc:'평일 밤 10시 이후까지 여는'},sunday:{label:'일요일',title:'일요일 약국',test:sunday,desc:'일요일에 여는'},holiday:{label:'공휴일',title:'공휴일 약국',test:holidayOpen,desc:'공휴일에 여는'}} as const;
export type Cond=keyof typeof CONDITIONS;
/** '월~금 09:00~21:00 · 토 09:00~15:00 · 일 휴무' */
export function weekLine(p:{hours:Pharmacy['hours']}){
  const out:string[]=[];let i=1;
  while(i<=7){const h=p.hours[String(i)];let j=i;while(j<7&&JSON.stringify(p.hours[String(j+1)])===JSON.stringify(h))j++;
    out.push(`${DAY_LABEL[String(i)]}${j>i?`~${DAY_LABEL[String(j)]}`:''} ${h?`${hm(h[0])}~${hm(h[1])}`:'휴무'}`);i=j+1;}
  return out.join(' · ');
}
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
/** 은/는 */
export const eun=(w:string)=>{const t=w.trim(),last=t[t.length-1]??'';const c=last.charCodeAt(0)-0xac00;return w+(c>=0&&c<11172&&c%28!==0?'은':'는');};
