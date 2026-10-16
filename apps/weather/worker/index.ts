// Cloudflare Worker for weather.guidejung.com: static pages come from ./out, /api/* is handled here.
// Upstream keys live only in Worker secrets (DATA_GO_KR_KEY); responses are cached per issue time.
// KV(guidejung-cache, 전 세계 공용): 발표 시각별 조각과 지역별 완성 응답(weather:wx:코드)을 저장한다. 5분마다 Cron이 특보·미세먼지를
// 받고 단기예보 발표마다 시군구 32곳씩 돌며 채워 두므로(256곳 약 40분), 어느 도시의 첫 방문자도 기상청을 기다리지 않는다.
// 초단기실황(지금 날씨)이 지난 사본은 바로 보여 주고 뒤에서 새로 만든다.
import regionsData from '../data/regions.json';
import type {Region,WeatherResponse} from '../lib/types';
import {midBase,nowcastBase,parseMid,parseNowcast,parseShort,shortBase,kst,ymd} from './kma';

type KV={get:(k:string,o:{type:'json';cacheTtl?:number})=>Promise<any>;put:(k:string,v:string,o?:{expirationTtl?:number})=>Promise<void>};
type Ctx={waitUntil:(p:Promise<unknown>)=>void};
type Env={DATA_GO_KR_KEY:string;CACHE?:KV;ASSETS:{fetch:(r:Request)=>Promise<Response>}};
const regions=regionsData as Region[];
const byCode=new Map(regions.map(r=>[r.code,r]));
const API='https://apis.data.go.kr';
const memo=new Map<string,{until:number;value:unknown}>();

async function upstream(url:string,tries=3,timeout=8000):Promise<any>{
  let last:unknown;
  for(let i=0;i<tries;i++){
    try{
      const res=await fetch(url,{signal:AbortSignal.timeout(timeout),cf:{cacheTtl:0}} as RequestInit);
      const text=await res.text();
      const body=JSON.parse(text);
      const code=body?.response?.header?.resultCode;
      if(code&&code!=='00'&&code!=='03')throw new Error(`upstream ${code} ${body.response.header.resultMsg}`);
      return body;
    }catch(e){last=e;await new Promise(r=>setTimeout(r,400*(i+1)));}
  }
  throw last;
}

/** Cache by key (which includes the issue time) in memory and in the colo cache; fall back to the last good value. */
const inflight=new Map<string,Promise<any>>();
/** Same key requested again while it is loading (many regions at once in the Cron) → one upstream call. */
function cached<T>(env:Env,key:string,ttl:number,load:()=>Promise<T>):Promise<{value:T|null;stale:boolean;error?:string}>{
  const hit=memo.get(key);if(hit&&hit.until>Date.now())return Promise.resolve({value:hit.value as T,stale:false});
  let p=inflight.get(key);if(p)return p;
  p=cachedLoad(env,key,ttl,load).finally(()=>inflight.delete(key));inflight.set(key,p);return p;
}
async function cachedLoad<T>(env:Env,key:string,ttl:number,load:()=>Promise<T>):Promise<{value:T|null;stale:boolean;error?:string}>{
  const cache=(globalThis as any).caches?.default as Cache|undefined;const req=new Request(`https://cache.weather.internal/${encodeURIComponent(key)}`);
  if(cache){const c=await cache.match(req);if(c){const v=await c.json() as T;memo.set(key,{until:Date.now()+60e3,value:v});return {value:v,stale:false};}}
  // Shared copy for this issue time (the key holds the issue time, so any copy is current).
  const shared=env.CACHE?await env.CACHE.get(`weather:c:${key}`,{type:'json',cacheTtl:300}).catch(()=>null) as T|null:null;
  if(shared!==null){memo.set(key,{until:Date.now()+Math.min(ttl,300)*1000,value:shared});
    if(cache)await cache.put(req,new Response(JSON.stringify(shared),{headers:{'cache-control':`max-age=${ttl}`}}));
    return {value:shared,stale:false};}
  const lastKey=new Request(`https://cache.weather.internal/last/${encodeURIComponent(key.replace(/:\d{8,12}$/,''))}`);
  try{
    const v=await load();
    memo.set(key,{until:Date.now()+Math.min(ttl,300)*1000,value:v});
    if(env.CACHE&&v!==null)await env.CACHE.put(`weather:c:${key}`,JSON.stringify(v),{expirationTtl:Math.max(ttl*2,3600)}).catch(()=>undefined);
    if(cache){
      const body=JSON.stringify(v);
      await cache.put(req,new Response(body,{headers:{'cache-control':`max-age=${ttl}`}}));
      await cache.put(lastKey,new Response(body,{headers:{'cache-control':'max-age=172800'}}));
    }
    return {value:v,stale:false};
  }catch(e){
    const old=cache?await cache.match(lastKey):undefined;
    return {value:old?await old.json() as T:null,stale:!!old,error:String((e as Error)?.message??e)};
  }
}

const items=(b:any)=>b?.response?.body?.items?.item??[];

/** 에어코리아 전국 측정소(약 670곳)를 한 번에 받아 1시간 캐시한다. 하루 500회 한도 안에서 지역·순위 화면이 함께 쓴다. */
function nationalAir(env:Env){
  const t=kst();
  return cached(env,`air:all:${ymd(t.date)}${String(t.h).padStart(2,'0')}`,3600,async()=>{
    const b=await upstream(`${API}/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${env.DATA_GO_KR_KEY}&returnType=json&numOfRows=1000&pageNo=1&sidoName=%EC%A0%84%EA%B5%AD&ver=1.0`,3,15000);
    return (b?.response?.body?.items??[]) as Record<string,string>[];});
}

/** 기상특보: 전국(stnId=108) 최신 통보문의 발효 현황(t6)과 예비특보(t7). 10분 단위로 캐시한다. */
function warnings(env:Env){
  const t=kst();const slot=`${ymd(t.date)}${String(t.h).padStart(2,'0')}${Math.floor(t.min/10)}`;
  return cached(env,`warn:${slot}`,600,async()=>{
    const it=items(await upstream(`${API}/1360000/WthrWrnInfoService/getWthrWrnMsg?serviceKey=${env.DATA_GO_KR_KEY}&pageNo=1&numOfRows=1&dataType=JSON&stnId=108`))[0];
    if(!it)return {time:null,title:'',active:[],preliminary:[]};
    const lines=(v:unknown)=>String(v??'').split(/\r?\n/).map(l=>l.replace(/^\s*(o|\(\d+\))\s*/,'').trim()).filter(l=>l&&!/^없\s*음$/.test(l));
    return {time:String(it.tmFc),title:String(it.t1??'').trim(),active:lines(it.t6),preliminary:lines(it.t7)};
  });
}

/** Issue times a region's answer depends on (미세먼지 is hourly and allowed to lag). The Cron pass follows the
 * slower ones only (단기예보 8번/일): a pass every hour for 초단기실황 would spend most of the daily API limit. */
function slowKey(){const sb=shortBase(),t=kst();return `${sb.date}${sb.time}|${midBase()}|${ymd(t.date)}${t.h<18?'06':'18'}`;}
function issueKey(){const nb=nowcastBase();return `${nb.date}${nb.time}|${slowKey()}`;}
type Wx={key:string;at:number;v:WeatherResponse};
const rebuilding=new Map<string,number>();
async function build(env:Env,r:Region,k:string){
  const v=await weather(env,r);
  if(env.CACHE&&!v.stale&&!v.errors.length)await env.CACHE.put(`weather:wx:${r.code}`,JSON.stringify({key:k,at:Date.now(),v} satisfies Wx),{expirationTtl:2*86400}).catch(()=>undefined);
  return v;
}
/**
 * Region answer from the shared complete copy: current issue times → as is; up to 4 hours old → returned at once and
 * rebuilt in the background (usually one 초단기실황 call, the rest is in KV); otherwise built now.
 */
async function regionWeather(env:Env,r:Region,ctx?:Ctx,force=false):Promise<WeatherResponse>{
  const k=issueKey();
  const wx=env.CACHE?await env.CACHE.get(`weather:wx:${r.code}`,{type:'json',cacheTtl:60}).catch(()=>null) as Wx|null:null;
  if(wx&&wx.key===k)return wx.v;
  if(wx&&!force&&Date.now()-wx.at<=4*3600e3){
    if((rebuilding.get(r.code)??0)<Date.now()){rebuilding.set(r.code,Date.now()+120e3);const p=build(env,r,k).catch(()=>undefined);ctx?ctx.waitUntil(p):void p;}
    return wx.v;
  }
  return build(env,r,k);
}

async function weather(env:Env,r:Region):Promise<WeatherResponse>{
  const key=env.DATA_GO_KR_KEY;const q=`serviceKey=${key}&pageNo=1&dataType=JSON`;
  const nb=nowcastBase(),sb=shortBase(),mb=midBase(),t=kst();
  const [now,short,mid,air,uv]=await Promise.all([
    cached(env,`now:${r.nx},${r.ny}:${nb.date}${nb.time}`,3600,async()=>parseNowcast(items(await upstream(`${API}/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?${q}&numOfRows=20&base_date=${nb.date}&base_time=${nb.time}&nx=${r.nx}&ny=${r.ny}`)))),
    cached(env,`short:${r.nx},${r.ny}:${sb.date}${sb.time}`,3*3600,async()=>parseShort(items(await upstream(`${API}/1360000/VilageFcstInfoService_2.0/getVilageFcst?${q}&numOfRows=1500&base_date=${sb.date}&base_time=${sb.time}&nx=${r.nx}&ny=${r.ny}`)))),
    cached(env,`mid:${r.midLand},${r.midTa}:${mb}`,12*3600,async()=>{
      const [land,ta]=await Promise.all([
        upstream(`${API}/1360000/MidFcstInfoService/getMidLandFcst?${q}&numOfRows=10&regId=${r.midLand}&tmFc=${mb}`),
        upstream(`${API}/1360000/MidFcstInfoService/getMidTa?${q}&numOfRows=10&regId=${r.midTa}&tmFc=${mb}`)]);
      return parseMid(mb,items(land)[0],items(ta)[0]);}),
    nationalAir(env),
    cached(env,`uv:${r.code}:${ymd(t.date)}${t.h<18?'06':'18'}`,6*3600,async()=>{
      // 생활기상지수는 시군구 행정코드로 조회하고, 코드가 없으면(행정구역 개편 직후 등) 시도 코드로 다시 조회한다.
      const time=`${ymd(t.date)}${t.h<18?'06':'18'}`;let it:Record<string,string>|undefined;
      for(const area of [r.code+'00000',r.sido+'00000000']){
        try{it=items(await upstream(`${API}/1360000/LivingWthrIdxServiceV5/getUVIdxV5?${q}&numOfRows=10&areaNo=${area}&time=${time}`,2))[0];}catch{it=undefined;}
        if(it)break;
      }
      if(!it)return null;const row=it;
      return {time,values:Object.entries(row).filter(([k,v])=>/^h\d+$/.test(k)&&v!=='').map(([k,v])=>({offset:Number(k.slice(1)),value:Number(v)}))};}),
  ]);
  const n=(v:string|undefined)=>v===undefined||v===''||v==='-'?null:Number(v);
  let airOut=null;
  for(const s of r.stations){
    const a=(air.value??[]).find(x=>x.stationName===s);
    if(a&&n(a.pm10Value)!==null){airOut={station:s,time:a.dataTime,pm10:n(a.pm10Value),pm25:n(a.pm25Value),pm10Grade:n(a.pm10Grade1h??a.pm10Grade),pm25Grade:n(a.pm25Grade1h??a.pm25Grade),khai:n(a.khaiValue)};break;}
  }
  // 단기예보의 마지막 날은 몇 시간만 있어 최저·최고가 틀릴 수 있다. 오늘 이후 날짜는 18시간 이상 있을 때만 쓰고, 나머지는 중기예보로 채운다.
  const today=ymd(t.date);const hoursOn=(d:string)=>(short.value?.hourly??[]).filter(h=>h.time.startsWith(d)).length;
  const midAll=mid.value??[];
  const shortDays=(short.value?.daily??[]).filter(d=>d.date===today||hoursOn(d.date)>=18||(hoursOn(d.date)>=6&&!midAll.some(m=>m.date===d.date)));
  const midDays=midAll.filter(d=>d.date>today&&!shortDays.some(s=>s.date===d.date));
  const todayKey=ymd(t.date)+String(t.h).padStart(2,'0')+'00';
  return {code:r.code,issued:{now:now.value?.time??null,short:short.value?`${sb.date}${sb.time}`:null,mid:mid.value?mb:null},
    now:now.value??null,hourly:(short.value?.hourly??[]).filter(h=>h.time>=todayKey).slice(0,48),daily:[...shortDays,...midDays].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,11),
    air:airOut,uv:uv.value??null,stale:[now,short,mid].some(x=>x.stale),errors:[now,short,mid,air,uv].map(x=>x.error).filter((e):e is string=>!!e).map(e=>e.replace(key,'***'))};
}

const json=(body:unknown,status=200,maxAge=300)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`}});

const BATCH=32;
/** Cron (5분마다): 특보·미세먼지, then the next 32 시군구 after each 단기예보 issue (all 256 in about 40 minutes, 8 passes a day). */
async function scheduled(env:Env,now:number){
  const kv=env.CACHE;if(!kv){return;}
  // Start mark first, so /api/status shows a run that was cut off before the end.
  await kv.put('weather:cron',JSON.stringify({at:now,started:Date.now(),key:env.DATA_GO_KR_KEY?undefined:'no service key'}));
  if(!env.DATA_GO_KR_KEY)return;
  const k=slowKey();const cur=await kv.get('weather:cursor',{type:'json'}).catch(()=>null) as {key:string;i:number}|null;
  const i=cur&&cur.key===k?cur.i:0;const part=regions.slice(i,i+BATCH);
  await Promise.allSettled([warnings(env),nationalAir(env)]);
  // 8 regions at a time: more parallel calls make 기상청 time out and retry (more calls, not fewer).
  let fails=0;
  for(let j=0;j<part.length;j+=8)fails+=(await Promise.allSettled(part.slice(j,j+8).map(r=>regionWeather(env,r,undefined,true)))).filter(x=>x.status==='rejected').length;
  await kv.put('weather:cursor',JSON.stringify({key:k,i:i+part.length}));
  await kv.put('weather:cron',JSON.stringify({at:now,done:Date.now(),key:k,from:i,count:part.length,fails,total:regions.length}));
}

export default {
  async scheduled(ev:{scheduledTime:number},env:Env,ctx:Ctx){
    ctx.waitUntil(scheduled(env,ev.scheduledTime).catch(e=>env.CACHE?.put('weather:cron',JSON.stringify({at:ev.scheduledTime,failed:Date.now(),err:String((e as Error)?.message??e).slice(0,200)}))));},
  async fetch(req:Request,env:Env,ctx?:Ctx):Promise<Response>{
    const url=new URL(req.url);
    if(url.pathname==='/api/weather'){
      const r=byCode.get(url.searchParams.get('code')??'');
      if(!r)return json({error:'unknown region'},404,3600);
      if(!env.DATA_GO_KR_KEY)return json({error:'service key missing'},503,0);
      try{return json(await regionWeather(env,r,ctx));}catch(e){return json({error:'upstream unavailable'},502,0);}
    }
    if(url.pathname==='/api/warnings'){
      if(!env.DATA_GO_KR_KEY)return json({error:'service key missing'},503,0);
      const w=await warnings(env);
      if(!w.value)return json({error:'upstream unavailable'},502,0);
      return json({...w.value,stale:w.stale},200,300);
    }
    if(url.pathname==='/api/air'){
      if(!env.DATA_GO_KR_KEY)return json({error:'service key missing'},503,0);
      const air=await nationalAir(env);
      if(!air.value)return json({error:'upstream unavailable'},502,0);
      const n=(v:string|undefined)=>v===undefined||v===''||v==='-'?null:Number(v);
      const stations=air.value.map(a=>({station:a.stationName,sido:a.sidoName,time:a.dataTime,pm10:n(a.pm10Value),pm25:n(a.pm25Value)})).filter(a=>a.pm10!==null||a.pm25!==null);
      return json({time:stations[0]?.time??null,stale:air.stale,stations},200,600);
    }
    // Approximate visitor position from Cloudflare's IP geolocation, for the first screen before any location prompt.
    if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
      return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
    // Health of the shared cache: last Cron run and how far the region pass has got.
    if(url.pathname==='/api/status'){const kv=env.CACHE;if(!kv)return json({kv:false},200,0);
      const [cron,cursor]=await Promise.all(['weather:cron','weather:cursor'].map(k=>kv.get(k,{type:'json'}).catch(()=>null)));
      return json({kv:true,issue:issueKey(),pass:slowKey(),cron:cron?{...cron,ageSec:Math.round((Date.now()-cron.at)/1000)}:null,cursor},200,0);}
    if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    return env.ASSETS.fetch(req);
  },
};
