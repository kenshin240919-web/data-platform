// 내근처 알림 1단계: 🌤️ 매일 아침 7시 우리 동네 날씨(어제와 비교) · 💊 일요일·공휴일 아침 8시 30분 지금 문 연 약국 수.
// 자매 사이트 API는 서비스 바인딩(WEATHER·PHARMACY)으로 부른다. 알림 주소에는 utm(?utm_source=push)을 붙여 GA로 클릭을 센다.
import {vsYesterday} from '../../weather/lib/format';
import type {WeatherResponse} from '../../weather/lib/types';
import {kstNow} from '../../pharmacy/lib/fmt';
import {allSubs,send,type Msg,type PushEnv,type Rec} from './push';

export interface AlertEnv extends PushEnv{WEATHER?:Fetcher;PHARMACY?:Fetcher}
export const TOPICS={weather:'🌤️ 매일 아침 7시 우리 동네 날씨',pharmacy:'💊 일요일·공휴일 아침 문 연 약국'} as const;
export type Topic=keyof typeof TOPICS;
const GRADE=['','좋음','보통','나쁨','매우 나쁨'];
const utm=(url:string,c:string)=>`${url}${url.includes('?')?'&':'?'}utm_source=push&utm_medium=web_push&utm_campaign=${c}`;
const n=(v:number)=>v.toLocaleString('ko-KR');

async function getJson<T>(f:Fetcher|undefined,url:string):Promise<T|null>{
  try{const r=await (f?f.fetch(url):fetch(url,{signal:AbortSignal.timeout(15000)}));return r.ok?await r.json() as T:null;}catch{return null;}
}
export async function weatherMsg(env:AlertEnv,r:Pick<Rec,'w'|'n'>):Promise<Msg|null>{
  const w=await getJson<WeatherResponse>(env.WEATHER,`https://weather.guidejung.com/api/weather?code=${r.w}`);
  if(!w?.now)return null;
  const d=w.daily?.[0],pop=d?Math.max(d.am?.pop??0,d.pm?.pop??0):null,g=Math.max(w.air?.pm10Grade??0,w.air?.pm25Grade??0);
  const vs=vsYesterday(w);
  const head=vs?`${vs.icon} ${vs.head}${vs.feel?` · ${vs.feel}`:''}`:`지금 ${w.now.temp}°`;
  const parts=[d?`오늘 ${d.min}~${d.max}°`:'',pop!=null?`비 ${pop}%`:'',GRADE[g]?`미세먼지 ${GRADE[g]}`:''].filter(Boolean);
  if(pop!=null&&pop>=60)parts.push('☔ 우산 챙기세요');
  return {title:`${r.n} 아침 날씨 · ${head}`,body:parts.join(' · '),url:utm(`https://weather.guidejung.com/region/${r.w}`,'weather'),tag:'gj-weather'};
}
export async function pharmacyMsg(env:AlertEnv,r:Pick<Rec,'c'|'n'|'lat'|'lon'>):Promise<Msg|null>{
  for(const km of [2,5]){
    const d=await getJson<{total:number;items:{name:string}[]}>(env.PHARMACY,`https://pharmacy.guidejung.com/api/near?lat=${r.lat.toFixed(4)}&lon=${r.lon.toFixed(4)}&km=${km}&cond=open&limit=1`);
    if(!d)return null;
    if(d.total||km===5){const now=kstNow();const day=now.holiday?'오늘(공휴일) ':now.day==='7'?'오늘(일요일) ':'지금 ';
      return {title:`💊 ${day}${r.n} 문 연 약국`,body:d.total?`지금 ${km}km 안 ${n(d.total)}곳이 문을 열었어요 · 가까운 곳: ${d.items[0]?.name??''}`:`${km}km 안에 지금 문 연 약국이 없어요 · 더 넓게 찾아보기`,
        url:utm(`https://pharmacy.guidejung.com/region/${r.c}`,'pharmacy'),tag:'gj-pharmacy'};}
  }
  return null;
}
/** 예약 발송: topic을 고른 구독에 지역별로 한 번만 데이터를 받아 보낸다. 끝난 구독(404·410)은 지운다. */
export async function sendTopic(env:AlertEnv,topic:Topic){
  const subs=(await allSubs(env)).filter(s=>s.rec.t.includes(topic));
  const cache=new Map<string,Promise<Msg|null>>();
  const make=(r:Rec)=>{const k=topic==='weather'?r.w:r.c;if(!cache.has(k))cache.set(k,topic==='weather'?weatherMsg(env,r):pharmacyMsg(env,r));return cache.get(k)!;};
  const res={sent:0,gone:0,fail:0,none:0};
  for(let i=0;i<subs.length;i+=20)await Promise.all(subs.slice(i,i+20).map(async({key,rec})=>{
    const m=await make(rec);if(!m){res.none++;return;}
    const s=await send(env,rec.sub,m);if(s==='gone'){res.gone++;await env.CACHE.delete(key);}else if(s==='ok')res.sent++;else res.fail++;}));
  await env.CACHE.put(`push:log:${topic}`,JSON.stringify({at:new Date().toISOString(),subs:subs.length,...res}),{expirationTtl:30*86400});
  return res;
}
