// Cloudflare Worker for traffic.guidejung.com: static pages from ./out, live data from the 한국도로공사 Open API.
// /api/traffic: 전국 고속도로 구간 소통(1회 약 8,400건·2.3MB) → 구간별 [속도, 등급]으로 줄여 5분 캐시.
// /api/incidents: 진행 중 돌발(작업·사고·통제 등) 10분 캐시. 오래된 사본은 바로 보여 주고 뒤에서 갱신한다.
import type {Incident,IncidentsResponse,TrafficResponse} from '../lib/types';
import vds from '../data/vds.json';

type Ctx={waitUntil:(p:Promise<unknown>)=>void};
type Env={EX_API_KEY:string;ITS_API_KEY?:string;ASSETS:{fetch:(r:Request)=>Promise<Response>}};
const BASE='https://data.ex.co.kr/openapi/';
// The API's firewall answers "Request Blocked" to clients without a browser-like User-Agent.
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const STALE_OK=6*3600;

async function upstream(env:Env,path:string,params:Record<string,string|number>,tries=3):Promise<any>{
  const q=new URLSearchParams({...Object.fromEntries(Object.entries(params).map(([k,v])=>[k,String(v)])),key:env.EX_API_KEY,type:'json'});
  let last:unknown;
  for(let i=0;i<tries;i++){
    try{const res=await fetch(`${BASE}${path}?${q}`,{headers:{'user-agent':UA,accept:'application/json'},signal:AbortSignal.timeout(25000)});
      const body=await res.json() as any;if(body?.code&&body.code!=='SUCCESS')throw new Error(`upstream ${body.code}`);return body;}
    catch(e){last=e;await new Promise(r=>setTimeout(r,600*(i+1)));}
  }
  throw last;
}
const kst=()=>new Date(Date.now()+9*3600e3).toISOString().slice(0,16).replace(/\D/g,'');
const at=(t:string)=>Date.UTC(+t.slice(0,4),+t.slice(4,6)-1,+t.slice(6,8),+t.slice(8,10)-9,+t.slice(10,12));

/**
 * One value per 구간: mean of reporting detectors, and the most common grade among them (ties go to the worse one).
 * The 1.9MB feed is scanned with a regex instead of JSON.parse (about 3ms vs 14ms in Node) to stay near the free plan's
 * 10ms CPU limit, and detectors are mapped to 구간 with vds.json because live rows sometimes leave conzoneId empty.
 */
async function loadTraffic(env:Env):Promise<TrafficResponse>{
  const res=await fetch(`${BASE}odtraffic/trafficAmountByRealtime?key=${env.EX_API_KEY}&type=json`,{headers:{'user-agent':UA,accept:'application/json'},signal:AbortSignal.timeout(25000)});
  const text=await res.text();
  const acc=new Map<string,{sum:number;n:number;g:number[]}>();const map=vds as Record<string,string>;
  for(const m of text.matchAll(/"vdsId":"([^"]+)"[^}]*?"speed":"(-?\d+)"[^}]*?"grade":"(\d)"/g)){
    const zone=map[m[1]];if(!zone)continue;
    let a=acc.get(zone);if(!a){a={sum:0,n:0,g:[0,0,0,0]};acc.set(zone,a);}
    const sp=+m[2],gr=+m[3];if(sp>0){a.sum+=sp;a.n++;}if(gr>=1&&gr<=3)a.g[gr]++;
  }
  const t=text.match(/"stdDate":"(\d{8})","speed"/)??text.match(/"stdDate":"(\d{8})"/),h=text.match(/"stdHour":"(\d{4})"/);
  const time=t&&h?t[1]+h[1]:'';
  const zones:TrafficResponse['zones']={};
  for(const [id,a] of acc){const g=a.g[3]&&a.g[3]>=Math.max(a.g[1],a.g[2])?3:a.g[2]&&a.g[2]>=a.g[1]?2:a.g[1]?1:0;zones[id]=[a.n?Math.round(a.sum/a.n):-1,g];}
  if(acc.size<500)throw new Error('traffic feed too small');
  return {time:time||kst(),zones,stale:false};
}

const SKIP=/이벤트|홍보/;
async function loadIncidents(env:Env):Promise<IncidentsResponse>{
  const first=await upstream(env,'burstInfo/realTimeSms',{numOfRows:99,pageNo:1});
  const rows:any[]=[...(first.realTimeSMSList??[])];const pages=Math.min(5,Number(first.pageSize)||1);
  for(let p=2;p<=pages;p++)rows.push(...((await upstream(env,'burstInfo/realTimeSms',{numOfRows:99,pageNo:p})).realTimeSMSList??[]));
  // Some rows stay "진행" for years (2023 홍보·작업 notices); keep the last 3 days only.
  const since=new Date(Date.now()+9*3600e3-3*86400e3).toISOString().slice(0,10).replace(/\D/g,'');
  const items:Incident[]=rows.filter(r=>r.accProcessNM!=='완료'&&!SKIP.test(r.accType??'')&&String(r.accDate??'').replace(/\D/g,'')>=since).map(r=>({type:r.accType??'',road:r.roadNM??'',dir:r.startEndTypeCode??'',
    text:String(r.smsText??'').replace(/\s+/g,' ').trim(),date:String(r.accDate??'').replace(/\D/g,''),time:String(r.accHour??'').slice(0,5),
    blocked:[1,2,3,4,5,6].filter(i=>r[`laneYn${i}`]==='Y').length}))
    .sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time));
  return {time:kst(),items,stale:false};
}

type Job<T>={name:string;ttl:number;load:(env:Env)=>Promise<T>;time:(v:T)=>string};
const JOBS={traffic:{name:'traffic',ttl:300,load:loadTraffic,time:(v:TrafficResponse)=>v.time},incidents:{name:'incidents',ttl:600,load:loadIncidents,time:(v:IncidentsResponse)=>v.time}};
const memo=new Map<string,{until:number;value:any}>();const inflight=new Map<string,Promise<any>>();
const key=(n:string,kind:string)=>new Request(`https://cache.traffic.internal/${kind}/${n}`);

function refresh<T>(env:Env,job:Job<T>):Promise<T>{
  let p=inflight.get(job.name) as Promise<T>|undefined;if(p)return p;
  p=(async()=>{
    const v=await job.load(env);memo.set(job.name,{until:Date.now()+job.ttl*1000,value:v});
    const cache=(globalThis as any).caches?.default as Cache|undefined;
    if(cache){const body=JSON.stringify(v);
      await cache.put(key(job.name,'fresh'),new Response(body,{headers:{'cache-control':`max-age=${job.ttl}`}}));
      await cache.put(key(job.name,'last'),new Response(body,{headers:{'cache-control':'max-age=172800'}}));}
    return v;
  })().finally(()=>inflight.delete(job.name));
  inflight.set(job.name,p);return p;
}

/** Fresh copy → as is. Older copy (≤6시간) → returned at once with refreshing:true while the API is called in the background. */
async function get<T extends {stale:boolean}>(env:Env,job:Job<T>,ctx?:Ctx):Promise<T&{refreshing?:boolean}>{
  const hit=memo.get(job.name);if(hit&&hit.until>Date.now())return hit.value;
  const cache=(globalThis as any).caches?.default as Cache|undefined;
  if(cache){const c=await cache.match(key(job.name,'fresh'));if(c){const v=await c.json() as T;memo.set(job.name,{until:Date.now()+30e3,value:v});return v;}}
  const old=cache?await cache.match(key(job.name,'last')).then(r=>r?r.json() as Promise<T>:undefined):undefined;
  if(old&&Date.now()-at(job.time(old))<=STALE_OK*1000){
    const lock=key(job.name,'lock');
    if(!(cache&&await cache.match(lock))){
      if(cache)await cache.put(lock,new Response('1',{headers:{'cache-control':'max-age=60'}}));
      const p=refresh(env,job).catch(()=>undefined);ctx?ctx.waitUntil(p):void p;
    }
    return {...old,refreshing:true};
  }
  try{return await refresh(env,job);}
  catch(e){if(old)return {...old,stale:true};throw e;}
}

/**
 * Temporary check (10/15): can this Worker reach the ITS CCTV API? ITS seemed to drop connections from overseas IPs.
 * Two small calls (cctvType 1·4, a box around 서울TG), result cached 6 hours because ITS allows only 1,000 calls a month.
 */
async function itsTest(env:Env):Promise<Response>{
  const cache=(globalThis as any).caches?.default as Cache|undefined;const k=new Request('https://cache.traffic.internal/its-test/v1');
  const hit=cache&&await cache.match(k);if(hit)return new Response(hit.body,{headers:{'content-type':'application/json; charset=utf-8','x-cache':'hit'}});
  if(!env.ITS_API_KEY)return json({error:'ITS_API_KEY missing'},503,0);
  const out:Record<string,unknown>={at:kst()};
  for(const t of [1,4]){
    const t0=Date.now();
    try{const r=await fetch(`https://openapi.its.go.kr:9443/cctvInfo?apiKey=${env.ITS_API_KEY}&type=ex&cctvType=${t}&minX=127.00&maxX=127.15&minY=37.30&maxY=37.45&getType=json`,{headers:{'user-agent':UA},signal:AbortSignal.timeout(20000)});
      const body=(await r.text()).replaceAll(env.ITS_API_KEY,'***');out[`type${t}`]={status:r.status,ms:Date.now()-t0,sample:body.slice(0,1500)};}
    catch(e){out[`type${t}`]={error:String(e),ms:Date.now()-t0};}
  }
  const body=JSON.stringify(out);
  if(cache)await cache.put(k,new Response(body,{headers:{'cache-control':'max-age=21600'}}));
  return new Response(body,{headers:{'content-type':'application/json; charset=utf-8'}});
}

const json=(body:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`}});

export default {
  async fetch(req:Request,env:Env,ctx?:Ctx):Promise<Response>{
    const url=new URL(req.url);
    const job=url.pathname==='/api/traffic'?JOBS.traffic:url.pathname==='/api/incidents'?JOBS.incidents:null;
    if(job){
      if(!env.EX_API_KEY)return json({error:'service key missing'},503,0);
      try{const v=await get(env,job as Job<any>,ctx);return json(v,200,v.refreshing?0:60);}catch{return json({error:'upstream unavailable'},502,0);}
    }
    if(url.pathname==='/api/its-test')return itsTest(env);
    if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    return env.ASSETS.fetch(req);
  },
};
