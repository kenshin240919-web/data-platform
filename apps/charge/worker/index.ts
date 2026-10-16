// Cloudflare Worker for charge.guidejung.com: static pages from ./out, /api/stations from the 한국환경공단 EV charger API.
// One district per call (numOfRows 9999), compacted to stations and cached 30 minutes so the 1,000 calls/day limit holds.
// Older copies are served instantly while a background refresh runs (stale-while-revalidate).
// KV(guidejung-cache, 전 세계 공용): 지역 목록 사본(charge:st:코드)과, 5분마다 Cron이 받는 전국 상태 변경(getChargerStatus
// period=5, 약 8,300~13,400건·1~2쪽, 하루 최대 576회/한도 1,000)을 최근 70분치 모아 둔 charge:delta. 응답할 때 목록에 최근 상태를
// 덮어씌우므로 목록은 1시간에 한 번만 새로 받아도 충전 가능 여부는 약 5분 이내로 맞다.
import {regions} from '../lib/regions';
import type {Charger,Station,StationsResponse} from '../lib/types';

type Ctx={waitUntil:(p:Promise<unknown>)=>void};
type KV={get:(k:string,o:{type:'json';cacheTtl?:number})=>Promise<any>;put:(k:string,v:string,o?:{expirationTtl?:number})=>Promise<void>};
type Env={DATA_GO_KR_KEY:string;CACHE?:KV;ASSETS:{fetch:(r:Request)=>Promise<Response>}};
type Delta={at:string;upd:Record<string,[number,string]>};
const codes=new Set(regions.map(r=>r.code));
const API='https://apis.data.go.kr/B552584/EvCharger/getChargerInfo';
const memo=new Map<string,{until:number;value:StationsResponse}>();
const TTL=3600,STALE_OK=2*86400,DELTA_MIN=70;

async function upstream(url:string,tries=3):Promise<any>{
  let last:unknown;
  for(let i=0;i<tries;i++){
    try{const res=await fetch(url,{signal:AbortSignal.timeout(20000)});const body=await res.json() as any;
      if(body?.resultCode&&body.resultCode!=='00')throw new Error(`upstream ${body.resultCode}`);
      if(!body?.items&&body?.OpenAPI_ServiceResponse)throw new Error('upstream key/service error');
      return body;}
    catch(e){last=e;await new Promise(r=>setTimeout(r,500*(i+1)));}
  }
  throw last;
}

function kst(ms=Date.now()){const d=new Date(ms+9*3600e3);return d.toISOString().slice(0,19).replace(/\D/g,'');}

async function load(env:Env,code:string):Promise<StationsResponse>{
  // Page 1 tells the total; any further pages (large cities such as 화성시) load in parallel.
  const url=(page:number)=>`${API}?serviceKey=${env.DATA_GO_KR_KEY}&pageNo=${page}&numOfRows=9999&dataType=JSON&zscode=${code}`;
  const first=await upstream(url(1));const rows:Record<string,string>[]=[...(first?.items?.item??[])];
  const pages=Math.min(5,Math.ceil(Number(first?.totalCount??rows.length)/9999));
  if(pages>1)for(const b of await Promise.all(Array.from({length:pages-1},(_,i)=>upstream(url(i+2)))))rows.push(...(b?.items?.item??[]));
  const map=new Map<string,Station>();
  for(const r of rows){
    if(r.delYn==='Y')continue;
    let s=map.get(r.statId);
    if(!s){s={id:r.statId,name:r.statNm,addr:[r.addr,r.addrDetail].filter(Boolean).join(' ').trim(),lat:Number(r.lat),lng:Number(r.lng),useTime:r.useTime??'',busi:r.busiNm??'',call:r.busiCall??'',
      freeParking:r.parkingFree==='Y',limited:r.limitYn==='Y'?(r.limitDetail||'이용 제한 있음'):null,chargers:[]};map.set(r.statId,s);}
    const c:Charger={id:r.chgerId,type:r.chgerType,kw:r.output?Number(r.output):null,stat:Number(r.stat)||9,upd:r.statUpdDt??''};
    s.chargers.push(c);
  }
  return {code,fetched:kst(),total:rows.length,stations:[...map.values()].filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lng)),stale:false};
}

const fetchedAt=(t:string)=>Date.UTC(+t.slice(0,4),+t.slice(4,6)-1,+t.slice(6,8),+t.slice(8,10)-9,+t.slice(10,12),+t.slice(12,14));
const inflight=new Map<string,Promise<StationsResponse>>();
const keys=(code:string)=>({fresh:new Request(`https://cache.charge.internal/stations/${code}`),last:new Request(`https://cache.charge.internal/last/${code}`)});

/** Calls the API once per region at a time (concurrent visitors share it) and stores fresh + last-good copies. */
function refresh(env:Env,code:string):Promise<StationsResponse>{
  let p=inflight.get(code);if(p)return p;
  p=(async()=>{
    const v=await load(env,code);memo.set(code,{until:Date.now()+TTL*1000,value:v});
    if(env.CACHE)await env.CACHE.put(`charge:st:${code}`,JSON.stringify(v),{expirationTtl:STALE_OK}).catch(()=>undefined);
    const cache=(globalThis as any).caches?.default as Cache|undefined;
    if(cache){const body=JSON.stringify(v),k=keys(code);
      await cache.put(k.fresh,new Response(body,{headers:{'cache-control':`max-age=${TTL}`}}));
      await cache.put(k.last,new Response(body,{headers:{'cache-control':'max-age=604800'}}));}
    return v;
  })().finally(()=>inflight.delete(code));
  inflight.set(code,p);return p;
}

/**
 * Fresh copy (≤30분) → returned as is. Older copy (≤2일) → returned at once with refreshing:true while the API is
 * called in the background, so visitors never wait on the slow upstream (화성시 ~7MB). No copy → wait for the API.
 */
async function stations(env:Env,code:string,ctx?:Ctx):Promise<StationsResponse>{
  const hit=memo.get(code);if(hit&&hit.until>Date.now())return hit.value;
  const cache=(globalThis as any).caches?.default as Cache|undefined;const k=keys(code);
  if(cache){const c=await cache.match(k.fresh);if(c){const v=await c.json() as StationsResponse;memo.set(code,{until:Date.now()+60e3,value:v});return v;}}
  // Shared copy from any data center.
  const shared=env.CACHE?await env.CACHE.get(`charge:st:${code}`,{type:'json',cacheTtl:60}).catch(()=>null) as StationsResponse|null:null;
  if(shared&&Date.now()-fetchedAt(shared.fetched)<=TTL*1000){
    const left=Math.max(60,Math.round(TTL-(Date.now()-fetchedAt(shared.fetched))/1000));memo.set(code,{until:Date.now()+Math.min(left,300)*1000,value:shared});
    if(cache)ctx?.waitUntil(cache.put(k.fresh,new Response(JSON.stringify(shared),{headers:{'cache-control':`max-age=${left}`}})));
    return shared;
  }
  const local=cache?await cache.match(k.last).then(r=>r?r.json() as Promise<StationsResponse>:undefined):undefined;
  const old=[local,shared??undefined].filter((x):x is StationsResponse=>!!x).sort((a,b)=>b.fetched.localeCompare(a.fetched))[0];
  if(old&&Date.now()-fetchedAt(old.fetched)<=STALE_OK*1000){
    // A short lock in the edge cache keeps other isolates (and the page's re-checks) from calling the API again meanwhile.
    const lock=new Request(`https://cache.charge.internal/lock/${code}`);
    if(!(cache&&await cache.match(lock))){
      if(cache)await cache.put(lock,new Response('1',{headers:{'cache-control':'max-age=90'}}));
      const job=refresh(env,code).catch(()=>undefined);ctx?ctx.waitUntil(job):void job;
    }
    return {...old,stale:false,refreshing:true};
  }
  try{return await refresh(env,code);}
  catch(e){if(old)return {...old,stale:true};throw e;}
}

/** Recent status changes (≤70분), kept by the Cron. Read once a minute per isolate. */
let deltaMemo:{until:number;value:Delta|null}|null=null;
async function delta(env:Env):Promise<Delta|null>{
  if(deltaMemo&&deltaMemo.until>Date.now())return deltaMemo.value;
  const v=env.CACHE?await env.CACHE.get('charge:delta',{type:'json',cacheTtl:60}).catch(()=>null) as Delta|null:null;
  deltaMemo={until:Date.now()+60e3,value:v};return v;
}
/** Newer charger states from the delta over the list (the list itself is up to an hour old). */
function overlay(v:StationsResponse,d:Delta|null):StationsResponse{
  if(!d||d.at<=v.fetched)return v;
  let n=0;
  const stations=v.stations.map(s=>{let changed=false;const chargers=s.chargers.map(c=>{const e=d.upd[`${s.id}|${c.id}`];if(e&&e[1]>c.upd){changed=true;n++;return {...c,stat:e[0],upd:e[1]};}return c;});return changed?{...s,chargers}:s;});
  return {...v,stations,fetched:d.at,updated:n};
}

/** Cron (5분마다): 전국 최근 5분 상태 변경을 받아 최근 70분치로 합쳐 KV에 둔다. */
async function scheduled(env:Env,now:number){
  const kv=env.CACHE;if(!kv)return;
  // Start mark first, so /api/status shows a run that was cut off before the end.
  await kv.put('charge:cron',JSON.stringify({at:now,started:Date.now(),err:env.DATA_GO_KR_KEY?undefined:'no service key'}));
  if(!env.DATA_GO_KR_KEY)return;
  let err:string|undefined,got=0,size=0;
  try{
    // Busy 5 minutes can pass 9,999 changes (10/16 11시: 13,407): read page 2 too.
    const url=(page:number)=>`https://apis.data.go.kr/B552584/EvCharger/getChargerStatus?serviceKey=${env.DATA_GO_KR_KEY}&pageNo=${page}&numOfRows=9999&dataType=JSON&period=5`;
    const b=await upstream(url(1),2);const rows:Record<string,string>[]=[...(b?.items?.item??[])];
    const pages=Math.min(2,Math.ceil(Number(b?.totalCount??rows.length)/9999));  // ≤2 pages: at most 576 calls/day of 1,000
    for(let p=2;p<=pages;p++)rows.push(...((await upstream(url(p),2))?.items?.item??[]));
    got=rows.length;
    const old=await kv.get('charge:delta',{type:'json'}).catch(()=>null) as Delta|null;
    const cut=kst(now-DELTA_MIN*60e3);const upd:Delta['upd']={};
    for(const [k,e] of Object.entries(old?.upd??{}))if(e[1]>=cut)upd[k]=e;
    let at=old?.at??'';
    for(const r of rows){if(!r.statId||!r.chgerId||!r.statUpdDt)continue;const k=`${r.statId}|${r.chgerId}`;const e=upd[k];if(!e||r.statUpdDt>e[1])upd[k]=[Number(r.stat)||9,r.statUpdDt];if(r.statUpdDt>at)at=r.statUpdDt;}
    const body=JSON.stringify({at:at||kst(now),upd} satisfies Delta);size=body.length;
    await kv.put('charge:delta',body);
  }catch(e){err=String((e as Error)?.message??e).replace(env.DATA_GO_KR_KEY,'***').slice(0,160);}
  await kv.put('charge:cron',JSON.stringify({at:now,done:Date.now(),got,size,err}));  // got>9,999 → extra pages were read
}

const json=(body:unknown,status=200,maxAge=300)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`}});

export default {
  async scheduled(ev:{scheduledTime:number},env:Env,ctx:Ctx){ctx.waitUntil(scheduled(env,ev.scheduledTime));},
  async fetch(req:Request,env:Env,ctx?:Ctx):Promise<Response>{
    const url=new URL(req.url);
    if(url.pathname==='/api/stations'){
      const code=url.searchParams.get('code')??'';
      if(!codes.has(code))return json({error:'unknown region'},404,3600);
      if(!env.DATA_GO_KR_KEY)return json({error:'service key missing'},503,0);
      try{const [v,d]=await Promise.all([stations(env,code,ctx),delta(env)]);return json(overlay(v,d),200,v.refreshing?0:60);}catch{return json({error:'upstream unavailable'},502,0);}
    }
    // Approximate visitor position from Cloudflare's IP geolocation, for the first screen before any location prompt.
    if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
      return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
    // Health of the shared cache: last Cron run and the age of the status changes.
    if(url.pathname==='/api/status'){const kv=env.CACHE;if(!kv)return json({kv:false},200,0);
      const [cron,d]=await Promise.all([kv.get('charge:cron',{type:'json'}).catch(()=>null),delta(env)]);
      return json({kv:true,cron:cron?{...cron,ageSec:Math.round((Date.now()-cron.at)/1000)}:null,delta:d?{at:d.at,count:Object.keys(d.upd).length}:null},200,0);}
    if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    return env.ASSETS.fetch(req);
  },
};
