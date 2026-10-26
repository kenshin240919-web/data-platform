// Client-side wording rules: summary line, clothing, air/UV grades, sunrise/sunset. Pure functions.
import type {Day,Hour,WeatherResponse} from './types';

export function skyEmoji(text:string,night=false){
  if(/눈/.test(text))return '🌨️';if(/소나기/.test(text))return '🌦️';if(/비|빗방울/.test(text))return '🌧️';
  if(/흐림/.test(text))return '☁️';if(/구름/.test(text))return night?'☁️':'⛅';return night?'🌙':'☀️';
}
/** Sky right now: the observed precipitation (초단기실황) wins over the next forecast hour. */
export function currentSky(w:WeatherResponse){
  const first=w.hourly[0];if(!first)return '';
  const pty=w.now&&w.now.pty!==null?w.now.pty:first.pty;
  return hourSky({...first,pty});
}
export function hourSky(h:Hour){
  if(h.pty&&h.pty>0)return ({1:'비',2:'비/눈',3:'눈',4:'소나기'} as Record<number,string>)[h.pty]??'비';
  return ({1:'맑음',3:'구름많음',4:'흐림'} as Record<number,string>)[h.sky??0]??'';
}
export const hh=(t:string)=>Number(t.slice(8,10));
export function dayLabel(date:string,today:string){
  const d=new Date(Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8)));const t=new Date(Date.UTC(+today.slice(0,4),+today.slice(4,6)-1,+today.slice(6,8)));
  const diff=Math.round((d.getTime()-t.getTime())/864e5);const wd='일월화수목금토'[d.getUTCDay()];
  return {name:diff===0?'오늘':diff===1?'내일':diff===2?'모레':`${wd}요일`,sub:`${+date.slice(4,6)}.${+date.slice(6,8)} (${wd})`,weekend:d.getUTCDay()===0||d.getUTCDay()===6};
}
export function todayKST(){const d=new Date(Date.now()+9*3600e3);return d.toISOString().slice(0,10).replace(/-/g,'');}

export function clothes(temp:number){
  if(temp>=28)return {short:'민소매·반팔',detail:'민소매, 반팔, 반바지, 원피스'};
  if(temp>=23)return {short:'반팔·얇은 셔츠',detail:'반팔, 얇은 셔츠, 반바지, 면바지'};
  if(temp>=20)return {short:'긴팔·얇은 가디건',detail:'얇은 가디건, 긴팔 티, 면바지, 청바지'};
  if(temp>=17)return {short:'맨투맨·얇은 니트',detail:'얇은 니트, 맨투맨, 가디건, 청바지'};
  if(temp>=12)return {short:'자켓·가디건',detail:'자켓, 가디건, 야상, 스타킹, 청바지'};
  if(temp>=9)return {short:'트렌치코트',detail:'트렌치코트, 야상, 니트, 기모 바지'};
  if(temp>=5)return {short:'코트·히트텍',detail:'코트, 가죽자켓, 히트텍, 니트, 레깅스'};
  return {short:'패딩·목도리',detail:'패딩, 두꺼운 코트, 목도리, 기모 제품'};
}
export function pmGrade(kind:'pm10'|'pm25',v:number|null){
  if(v===null)return null;const [a,b,c]=kind==='pm10'?[30,80,150]:[15,35,75];
  return v<=a?{text:'좋음',level:1}:v<=b?{text:'보통',level:2}:v<=c?{text:'나쁨',level:3}:{text:'매우나쁨',level:4};
}
export function uvGrade(v:number){return v<3?'낮음':v<6?'보통':v<8?'높음':v<11?'매우높음':'위험';}

/** Wind chill (기상청 겨울철 체감온도). Only meaningful at ≤10℃ and wind ≥1.3m/s. */
export function feelsLike(temp:number|null,wind:number|null){
  if(temp===null||wind===null||temp>10||wind<1.3)return null;
  const v=Math.pow(wind*3.6,0.16);return Math.round((13.12+0.6215*temp-11.37*v+0.3965*temp*v)*10)/10;
}

/** One-line answer at the top of the page. */
export function summary(w:WeatherResponse){
  const today=todayKST();const next24=w.hourly.slice(0,24);
  const wet=next24.find(h=>(h.pty??0)>0||(h.pop??0)>=60);
  const day=w.daily.find(d=>d.date===today)??w.daily[0];
  const parts:string[]=[];
  if(wet){const kind=/눈/.test(hourSky(wet))?'눈':'비';const when=wet.time.slice(0,8)===today?`${hh(wet.time)}시`:`내일 ${hh(wet.time)}시`;
    parts.push((w.now?(w.now.pty??0)>0:wet===next24[0]&&(wet.pty??0)>0)?`지금 ${kind}가 와요. 우산 꼭 챙기세요`:`${when}부터 ${kind} 소식, 우산 챙기세요`);}
  else if(day&&day.max!==null&&day.min!==null&&day.max-day.min>=10)parts.push(`일교차가 ${Math.round(day.max-day.min)}도로 커요. 겉옷 챙기세요`);
  else{const s=next24[0]?hourSky(next24[0]):'';parts.push(s==='맑음'?'맑은 하루예요. 비 소식 없어요':s?`${s}, 비 소식은 없어요`:'오늘 날씨를 확인하세요');}
  const pm=pmGrade('pm25',w.air?.pm25??null);if(pm&&pm.level>=3)parts.push(`초미세먼지 ${pm.text}, 마스크 챙기세요`);
  return parts.join(' · ');
}
export function rainStart(w:WeatherResponse){
  const wet=w.hourly.slice(0,24).find(h=>(h.pty??0)>0||(h.pop??0)>=60);
  if(!wet)return {need:false,text:'필요 없어요',sub:'24시간 비 소식 없음'};
  return {need:true,text:wet.time.slice(0,8)===todayKST()?`${hh(wet.time)}시부터`:`내일 ${hh(wet.time)}시부터`,sub:`강수확률 ${wet.pop??'-'}%`};
}
export function weekendLine(days:Day[]){
  const today=todayKST();const we=days.filter(d=>dayLabel(d.date,today).weekend&&d.date>=today).slice(0,2);
  if(!we.length)return null;const wet=we.some(d=>Math.max(d.am.pop??0,d.pm.pop??0)>=50||/비|눈|소나기/.test(d.am.sky+d.pm.sky));
  return wet?'이번 주말 비 소식이 있어요. 실내 여행지를 찾아보세요':'이번 주말 날씨가 좋아요. 나들이 가기 좋은 곳을 찾아보세요';
}

/** NOAA sunrise/sunset approximation, returned as KST "HH:MM". */
export function sunTimes(lat:number,lon:number,date=new Date()){
  const rad=Math.PI/180;const day=Math.floor((Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())-Date.UTC(date.getUTCFullYear(),0,0))/864e5);
  const g=2*Math.PI/365*(day-1);
  const eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  const dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  const ha=Math.acos(Math.cos(90.833*rad)/(Math.cos(lat*rad)*Math.cos(dec))-Math.tan(lat*rad)*Math.tan(dec))/rad;
  const fmt=(m:number)=>{const t=(Math.round(m+540)%1440+1440)%1440;return `${String(Math.floor(t/60)).padStart(2,'0')}:${String(t%60).padStart(2,'0')}`;};
  return {rise:fmt(720-4*(lon+ha)-eq),set:fmt(720-4*(lon-ha)-eq)};
}
/**
 * 어제 이 시각과 비교(첫 화면 맨 위 한 줄): 지금 실황 기온 − 어제 같은 시각 실황 기온. 1도 미만 차이는 '비슷해요'.
 * 느낌 말은 오늘 기온으로 고른다(같은 3도 차이라도 2도일 땐 '추워요', 20도일 땐 '선선해요').
 */
export function vsYesterday(w:WeatherResponse){
  const t=w.now?.temp,y=w.yesterday?.temp;if(t==null||y==null||!w.now)return null;
  const h=+w.now.time.slice(8,10);const when=h===0?'자정':h<12?`오전 ${h}시`:h===12?'낮 12시':`오후 ${h-12}시`;
  const d=t-y,abs=Math.round(Math.abs(d));const sub=`어제 ${when} ${y}° → 오늘 ${t}°`;
  if(Math.abs(d)<1)return {kind:'same' as const,icon:'🙂',head:'어제 이맘때와 비슷해요',feel:t<=5?'오늘도 추워요':t>=28?'오늘도 더워요':'',tip:'',sub};
  if(d<0){const feel=abs>=5&&t<=17?'확 추워졌어요':t<=0?'많이 추워요':t<=10?'추워요':t<=17?'쌀쌀해요':t<=23?'선선해요':'조금 덜 더워요';
    return {kind:'cold' as const,icon:t<=10?'🥶':'🍂',head:`어제보다 ${abs}° 낮아요`,feel,tip:abs>=3&&t<=20?'겉옷 하나 더 챙기세요':'',sub};}
  const feel=t>=30?'무더워요':t>=25?'더워요':t>=18?'따뜻해요':t>=10?'포근해요':'덜 추워요';
  return {kind:'warm' as const,icon:t>=25?'🥵':'🌤️',head:`어제보다 ${abs}° 높아요`,feel,tip:abs>=3&&t>=25?'옷을 가볍게 입으세요':abs>=3&&t<10?'그래도 아직 쌀쌀해요':'',sub};
}
