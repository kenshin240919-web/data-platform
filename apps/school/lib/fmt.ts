// Shared by the static pages, the browser and the Worker (no imports): labels, dates, meal parsing and the school shape.
export const SITE='https://school.guidejung.com';
export const BRAND='내 학교';
export const TAGLINE='오늘 급식 뭐야?';
// 사이트 분류(scripts/collect-school.py KINDS): 시간표 API도 이걸로 고름.
export const KIND_LABEL:Record<string,string>={elem:'초등학교',middle:'중학교',high:'고등학교',special:'특수학교',other:'기타 학교'};
export const KIND_ICON:Record<string,string>={elem:'🎒',middle:'📘',high:'🎓',special:'🤝',other:'🏫'};
export const KIND_ORDER=['elem','middle','high','special','other'];
export const TIMETABLE_API:Record<string,string>={elem:'elsTimetable',middle:'misTimetable',high:'hisTimetable',special:'spsTimetable'};
export const GRADES_OF:Record<string,number>={elem:6,middle:3,high:3,special:12,other:12};
// 급식 메뉴 뒤 괄호 숫자(식품의약품안전처 알레르기 유발 식품 표시 번호).
export const ALLERGENS=['','난류','우유','메밀','땅콩','대두','밀','고등어','게','새우','돼지고기','복숭아','토마토','아황산류','호두','닭고기','쇠고기','오징어','조개류','잣'];

export type School={code:string;office:string;name:string;eng:string|null;kind:string;k:string;found:string|null;coedu:string|null;hs:string|null;
  address:string|null;detail:string|null;zip:string|null;tel:string|null;homepage:string|null;night:boolean;founded:string|null;org:string|null;
  lat:number|null;lon:number|null;region:string;region_name:string};
export type Card={code:string;name:string;kind:string;k:string;region_name:string;address:string|null;lat:number|null;lon:number|null;km?:number};
export type Dish={name:string;allergens:number[]};
export type Meal={type:string;dishes:Dish[];cal:string|null;origin?:string|null;nutrition?:string|null};
export type MealDay={date:string;meals:Meal[]};
export type Event={date:string;end?:string;name:string;off:boolean;grades:number[]};
export type Today={school:Card;today:string;meal:MealDay|null;next:MealDay|null;events:Event[];timetable:{date:string;periods:string[]}|null;errors?:string[]};

export const card=(s:School):Card=>({code:s.code,name:s.name,kind:s.kind,k:s.k,region_name:s.region_name,address:s.address,lat:s.lat,lon:s.lon});
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]!);
export const schoolPath=(code:string)=>`/school/${code}`;
export const ymd=(s?:string|null)=>s&&/^\d{8}$/.test(s)?`${s.slice(0,4)}.${s.slice(4,6)}.${s.slice(6,8)}`:null;
const WD=['일','월','화','수','목','금','토'];
const d8=(s:string)=>new Date(Date.UTC(+s.slice(0,4),+s.slice(4,6)-1,+s.slice(6,8)));
export const weekday=(s:string)=>WD[d8(s).getUTCDay()];
/** '20261020' → '10월 20일(화)' */
export const mdw=(s:string)=>`${+s.slice(4,6)}월 ${+s.slice(6,8)}일(${weekday(s)})`;
/** 한국 날짜 'YYYYMMDD' (now + days). */
export const kstDay=(days=0,now=Date.now())=>new Date(now+9*3600e3+days*864e5).toISOString().slice(0,10).replace(/-/g,'');
export const addDays=(s:string,days:number)=>new Date(d8(s).getTime()+days*864e5).toISOString().slice(0,10).replace(/-/g,'');
export const dayDiff=(from:string,to:string)=>Math.round((d8(to).getTime()-d8(from).getTime())/864e5);
/** 그 주 월요일. */
export const monday=(s:string)=>addDays(s,-((d8(s).getUTCDay()+6)%7));
/** 학년도: 3월에 시작(1·2월은 앞 해 학년도). */
export const schoolYear=(s:string)=>+s.slice(4,6)>=3?s.slice(0,4):String(+s.slice(0,4)-1);
/** 'D-23' · 'D-DAY' */
export const dday=(from:string,to:string)=>{const d=dayDiff(from,to);return d===0?'D-DAY':d>0?`D-${d}`:`D+${-d}`;};

/** NEIS DDISH_NM '기장밥 <br/>민물새우고추장수제비국 (5.6.9)<br/>…' → dishes with allergen numbers. */
export function parseDishes(raw:string):Dish[]{
  return raw.split(/<br\s*\/?>/i).map(x=>x.trim()).filter(Boolean).map(x=>{
    const m=x.match(/\(([\d.\s]+)\)\s*$/);
    const allergens=m?[...new Set(m[1].split('.').map(Number).filter(v=>v>=1&&v<ALLERGENS.length))]:[];
    // 학교 식단표의 끝 숫자·기호('조랭이떡월과채1', '멘츠까스(소스포함)1')는 메뉴 이름이 아니라 뺌.
    return {name:(m?x.slice(0,m.index):x).trim().replace(/(?<=[가-힣)])\d+$/,'').replace(/[*#]+$/,'').trim(),allergens};
  }).filter(d=>d.name);
}
/** 급식 한 줄 요약: '기장밥 · 민물새우고추장수제비국 · 청포묵무침 …' */
export const menuLine=(m:Meal,max=6)=>m.dishes.slice(0,max).map(d=>d.name).join(' · ')+(m.dishes.length>max?' …':'');
/** 일정 날짜: '10월 26일(월)' 또는 '10월 26일(월)~28일(수)' */
export const eventDate=(e:Event)=>e.end?`${mdw(e.date)}~${e.end.slice(4,6)===e.date.slice(4,6)?`${+e.end.slice(6,8)}일(${weekday(e.end)})`:mdw(e.end)}`:mdw(e.date);
/** 학사일정에서 D-day로 보여 줄 큰 행사(토요휴업일·매주 반복되는 일정은 뺌). */
export const bigEvent=(e:Event)=>!/토요휴업|^토요|주말/.test(e.name);
/** 은/는 (digits read in Korean: 0·1·3·6·7·8 end in a consonant). */
export const eun=(w:string)=>{const t=w.trim(),last=t[t.length-1]??'';const c=last.charCodeAt(0)-0xac00;
  const batchim=c>=0&&c<11172?c%28!==0:/[013678]/.test(last);return w+(batchim?'은':'는');};
