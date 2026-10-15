// Cloudflare Worker for charge.guidejung.com: static pages from ./out, /api/stations from the 한국환경공단 EV charger API.
// One district per call (numOfRows 9999), compacted to stations and cached 30 minutes so the 1,000 calls/day limit holds.
// Older copies are served instantly while a background refresh runs (stale-while-revalidate).
import {regions} from '../lib/regions';
import type {Charger,Station,StationsResponse} from '../lib/types';

type Ctx={waitUntil:(p:Promise<unknown>)=>void};
type Env={DATA_GO_KR_KEY:string;ASSETS:{fetch:(r:Request)=>Promise<Response>}};
const codes=new Set(regions.map(r=>r.code));
const API='https://apis.data.go.kr/B552584/EvCharger/getChargerInfo';
const memo=new Map<string,{until:number;value:StationsResponse}>();
const TTL=1800,STALE_OK=2*86400;

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

function kst(){const d=new Date(Date.now()+9*3600e3);return d.toISOString().slice(0,19).replace(/\D/g,'');}

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
  const old=cache?await cache.match(k.last).then(r=>r?r.json() as Promise<StationsResponse>:undefined):undefined;
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

const json=(body:unknown,status=200,maxAge=300)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`}});

export default {
  async fetch(req:Request,env:Env,ctx?:Ctx):Promise<Response>{
    const url=new URL(req.url);
    if(url.pathname==='/api/stations'){
      const code=url.searchParams.get('code')??'';
      if(!codes.has(code))return json({error:'unknown region'},404,3600);
      if(!env.DATA_GO_KR_KEY)return json({error:'service key missing'},503,0);
      try{const v=await stations(env,code,ctx);return json(v,200,v.refreshing?0:120);}catch{return json({error:'upstream unavailable'},502,0);}
    }
    // Approximate visitor position from Cloudflare's IP geolocation, for the first screen before any location prompt.
    if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
      return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
    if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    return env.ASSETS.fetch(req);
  },
};
