// 내근처 알림: 🌤️ 매일 아침 7시 우리 동네 날씨(어제와 비교) · 💊 일요일·공휴일 아침 8시 30분 지금 문 연 약국 수
// · 🎁 아침 8시 30분 우리 동네 새 혜택·마감 3일 전(있는 날만) + 월요일엔 한 주 요약.
// 자매 사이트 API는 서비스 바인딩(WEATHER·PHARMACY·BENEFIT)으로 부른다. 알림 주소에는 utm(?utm_source=push)을 붙여 GA로 클릭을 센다.
import {vsYesterday} from '../../weather/lib/format';
import type {WeatherResponse} from '../../weather/lib/types';
import {kstNow} from '../../pharmacy/lib/fmt';
import {allSubs,send,type Msg,type PushEnv,type Rec} from './push';

export interface AlertEnv extends PushEnv{WEATHER?:Fetcher;PHARMACY?:Fetcher;BENEFIT?:Fetcher}
export const TOPICS={weather:'🌤️ 매일 아침 7시 우리 동네 날씨',pharmacy:'💊 일요일·공휴일 아침 문 연 약국',benefit:'🎁 우리 동네 새 혜택·마감 3일 전'} as const;
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
type BenefitAlert={code:string;name:string;today:string;ids:[string,string][];due:[string,string,string][];dueN:number;ch:number;chTop:[string,string][]};
const bfUrl=(path:string)=>utm(`https://benefit.guidejung.com${path}`,'benefit');
const closed=(nm:string)=>/^\s*[\[(【]\s*(모집\s*종료|마감|종료)/.test(nm);
const cut=(s:string,k=22)=>s.length>k?s.slice(0,k-1)+'…':s;
const plusDays=(ymd:string,d:number)=>new Date(Date.parse(ymd)+d*864e5).toISOString().slice(0,10);
/** 🎁 우리 동네(시군구+시도) 혜택: 어제 본 목록에 없던 것 = 새 혜택, 날짜가 정확한 마감 3일 전. 월요일(weekly)엔 소식이 없어도 한 주 요약.
 * 지역별 지난 목록은 KV `push:bf:{코드}`(처음엔 기준만 저장하고 보내지 않음, 한꺼번에 20개 넘게 늘면 수집 규칙이 바뀐 것으로 보고 기준만 바꿈).
 * dry=true(시험 알림)는 KV를 바꾸지 않고 소식이 없으면 요약을 보낸다. */
export async function benefitMsg(env:AlertEnv,r:Pick<Rec,'c'>,o:{weekly?:boolean;dry?:boolean}={}):Promise<Msg|null>{
  const d=await getJson<BenefitAlert>(env.BENEFIT,`https://benefit.guidejung.com/alert/${r.c}`);
  if(!d?.ids)return null;
  const key=`push:bf:${r.c}`,prev=await env.CACHE.get(key,'json') as string[]|null;
  const was=new Set(prev??[]);let fresh=prev?d.ids.filter(([id])=>!was.has(id)):[];
  if(fresh.length>20)fresh=[];
  fresh=fresh.filter(([,nm])=>!closed(nm));
  if(!o.dry)await env.CACHE.put(key,JSON.stringify(d.ids.map(([id])=>id)),{expirationTtl:60*86400});
  const today=new Date(Date.now()+9*3600e3).toISOString().slice(0,10),d3=d.due.filter(x=>x[2]===plusDays(today,3));
  const parts:string[]=[];
  if(fresh.length)parts.push(`새 혜택: ${cut(fresh[0][1])}${fresh.length>1?` 외 ${n(fresh.length-1)}가지`:''}`);
  if(d3.length)parts.push(`3일 뒤 마감: ${cut(d3[0][1])}${d3.length>1?` 외 ${n(d3.length-1)}건`:''}`);
  const one=fresh.length+d3.length===1?(fresh[0]??d3[0])[0]:null;
  if(parts.length)return {title:`🎁 ${d.name} ${fresh.length?`새 혜택 ${n(fresh.length)}가지`:'혜택 마감 3일 전'}`,body:parts.join(' · '),
    url:bfUrl(one?`/b/${one}`:`/region/${d.code}`),tag:'gj-benefit'};
  if(!o.weekly&&!o.dry)return null;
  const sum=[d.dueN?`이번 달 안 마감 ${n(d.dueN)}건`:'',d.ch?`최근 7일 내용이 바뀐 혜택 ${n(d.ch)}가지`:'',d.chTop.find(([,nm])=>!closed(nm))?`예: ${cut(d.chTop.find(([,nm])=>!closed(nm))![1])}`:''].filter(Boolean);
  if(!sum.length&&!o.dry)return null;
  return {title:`🎁 이번 주 ${d.name} 혜택 소식`,body:sum.join(' · ')||`우리 동네에서 받을 수 있는 혜택 ${n(d.ids.length)}가지를 확인해 보세요`,url:bfUrl(`/region/${d.code}`),tag:'gj-benefit'};
}
/** 예약 발송: topic을 고른 구독에 지역별로 한 번만 데이터를 받아 보낸다. 끝난 구독(404·410)은 지운다. */
export async function sendTopic(env:AlertEnv,topic:Topic,o:{weekly?:boolean}={}){
  const subs=(await allSubs(env)).filter(s=>s.rec.t.includes(topic));
  const cache=new Map<string,Promise<Msg|null>>();
  const make=(r:Rec)=>{const k=topic==='weather'?r.w:r.c;if(!cache.has(k))cache.set(k,topic==='weather'?weatherMsg(env,r):topic==='benefit'?benefitMsg(env,r,o):pharmacyMsg(env,r));return cache.get(k)!;};
  const res={sent:0,gone:0,fail:0,none:0};
  for(let i=0;i<subs.length;i+=20)await Promise.all(subs.slice(i,i+20).map(async({key,rec})=>{
    const m=await make(rec);if(!m){res.none++;return;}
    const s=await send(env,rec.sub,m);if(s==='gone'){res.gone++;await env.CACHE.delete(key);}else if(s==='ok')res.sent++;else res.fail++;}));
  await env.CACHE.put(`push:log:${topic}`,JSON.stringify({at:new Date().toISOString(),subs:subs.length,...res}),{expirationTtl:30*86400});
  return res;
}
