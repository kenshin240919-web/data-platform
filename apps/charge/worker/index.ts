// Cloudflare Worker for charge.guidejung.com: static pages from ./out, /api/stations from the 한국환경공단 EV charger API.
// One district per call (numOfRows 9999), compacted to stations and cached 30 minutes so the 1,000 calls/day limit holds.
import {regions} from '../lib/regions';
import type {Charger,Station,StationsResponse} from '../lib/types';

type Env={DATA_GO_KR_KEY:string;ASSETS:{fetch:(r:Request)=>Promise<Response>}};
const codes=new Set(regions.map(r=>r.code));
const API='https://apis.data.go.kr/B552584/EvCharger/getChargerInfo';
const memo=new Map<string,{until:number;value:StationsResponse}>();
const TTL=1800;

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
  const rows:Record<string,string>[]=[];let total=0;
  for(let page=1;page<=5;page++){
    const b=await upstream(`${API}?serviceKey=${env.DATA_GO_KR_KEY}&pageNo=${page}&numOfRows=9999&dataType=JSON&zscode=${code}`);
    const items=b?.items?.item??[];rows.push(...items);total=Number(b?.totalCount??rows.length);
    if(rows.length>=total||!items.length)break;
  }
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

async function stations(env:Env,code:string):Promise<StationsResponse>{
  const hit=memo.get(code);if(hit&&hit.until>Date.now())return hit.value;
  const cache=(globalThis as any).caches?.default as Cache|undefined;
  const key=new Request(`https://cache.charge.internal/stations/${code}`),last=new Request(`https://cache.charge.internal/last/${code}`);
  if(cache){const c=await cache.match(key);if(c){const v=await c.json() as StationsResponse;memo.set(code,{until:Date.now()+60e3,value:v});return v;}}
  try{
    const v=await load(env,code);memo.set(code,{until:Date.now()+TTL*1000,value:v});
    if(cache){const body=JSON.stringify(v);await cache.put(key,new Response(body,{headers:{'cache-control':`max-age=${TTL}`}}));await cache.put(last,new Response(body,{headers:{'cache-control':'max-age=172800'}}));}
    return v;
  }catch(e){
    const old=cache?await cache.match(last):undefined;
    if(old)return {...(await old.json() as StationsResponse),stale:true};
    throw e;
  }
}

const json=(body:unknown,status=200,maxAge=300)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`}});

export default {
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    if(url.pathname==='/api/stations'){
      const code=url.searchParams.get('code')??'';
      if(!codes.has(code))return json({error:'unknown region'},404,3600);
      if(!env.DATA_GO_KR_KEY)return json({error:'service key missing'},503,0);
      try{return json(await stations(env,code),200,120);}catch{return json({error:'upstream unavailable'},502,0);}
    }
    if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    return env.ASSETS.fetch(req);
  },
};
