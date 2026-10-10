// Cloudflare Worker for weather.guidejung.com: static pages come from ./out, /api/* is handled here.
// Upstream keys live only in Worker secrets (DATA_GO_KR_KEY); responses are cached per issue time.
import regionsData from '../data/regions.json';
import type {Region,WeatherResponse} from '../lib/types';
import {midBase,nowcastBase,parseMid,parseNowcast,parseShort,shortBase,kst,ymd} from './kma';

type Env={DATA_GO_KR_KEY:string;ASSETS:{fetch:(r:Request)=>Promise<Response>}};
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
async function cached<T>(key:string,ttl:number,load:()=>Promise<T>):Promise<{value:T|null;stale:boolean;error?:string}>{
  const hit=memo.get(key);if(hit&&hit.until>Date.now())return {value:hit.value as T,stale:false};
  const cache=(globalThis as any).caches?.default as Cache|undefined;const req=new Request(`https://cache.weather.internal/${encodeURIComponent(key)}`);
  if(cache){const c=await cache.match(req);if(c){const v=await c.json() as T;memo.set(key,{until:Date.now()+60e3,value:v});return {value:v,stale:false};}}
  const lastKey=new Request(`https://cache.weather.internal/last/${encodeURIComponent(key.replace(/:\d{8,12}$/,''))}`);
  try{
    const v=await load();
    memo.set(key,{until:Date.now()+Math.min(ttl,300)*1000,value:v});
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

async function weather(env:Env,r:Region):Promise<WeatherResponse>{
  const key=env.DATA_GO_KR_KEY;const q=`serviceKey=${key}&pageNo=1&dataType=JSON`;
  const nb=nowcastBase(),sb=shortBase(),mb=midBase(),t=kst();
  const [now,short,mid,air,uv]=await Promise.all([
    cached(`now:${r.nx},${r.ny}:${nb.date}${nb.time}`,3600,async()=>parseNowcast(items(await upstream(`${API}/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?${q}&numOfRows=20&base_date=${nb.date}&base_time=${nb.time}&nx=${r.nx}&ny=${r.ny}`)))),
    cached(`short:${r.nx},${r.ny}:${sb.date}${sb.time}`,3*3600,async()=>parseShort(items(await upstream(`${API}/1360000/VilageFcstInfoService_2.0/getVilageFcst?${q}&numOfRows=1500&base_date=${sb.date}&base_time=${sb.time}&nx=${r.nx}&ny=${r.ny}`)))),
    cached(`mid:${r.midLand},${r.midTa}:${mb}`,12*3600,async()=>{
      const [land,ta]=await Promise.all([
        upstream(`${API}/1360000/MidFcstInfoService/getMidLandFcst?${q}&numOfRows=10&regId=${r.midLand}&tmFc=${mb}`),
        upstream(`${API}/1360000/MidFcstInfoService/getMidTa?${q}&numOfRows=10&regId=${r.midTa}&tmFc=${mb}`)]);
      return parseMid(mb,items(land)[0],items(ta)[0]);}),
    cached(`air:all:${ymd(t.date)}${String(t.h).padStart(2,'0')}`,3600,async()=>{
      const b=await upstream(`${API}/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty?serviceKey=${key}&returnType=json&numOfRows=1000&pageNo=1&sidoName=%EC%A0%84%EA%B5%AD&ver=1.0`,3,15000);
      return (b?.response?.body?.items??[]) as Record<string,string>[];}),
    cached(`uv:${r.code}:${ymd(t.date)}${t.h<18?'06':'18'}`,6*3600,async()=>{
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

export default {
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    if(url.pathname==='/api/weather'){
      const r=byCode.get(url.searchParams.get('code')??'');
      if(!r)return json({error:'unknown region'},404,3600);
      if(!env.DATA_GO_KR_KEY)return json({error:'service key missing'},503,0);
      try{return json(await weather(env,r));}catch(e){return json({error:'upstream unavailable'},502,0);}
    }
    if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    return env.ASSETS.fetch(req);
  },
};
