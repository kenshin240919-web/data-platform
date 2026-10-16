// Cloudflare Worker for trip.guidejung.com: static pages from apps/trip/out, places from D1 (guidejung-trip).
// /place/{id}, /festival/{id}: rendered from D1 when the place is there (cached per data version), else the static file.
// /api/search: the site search on D1. /api/status: data version and counts.
import type {Place} from '../../../packages/ui/src/types';
import {todayKST,type Query} from '../../../packages/ui/src/search';
import {meta,place,search,status,type D1} from './db';
import {detailHtml} from './render';

type Ctx={waitUntil:(p:Promise<unknown>)=>void};
type Env={DB?:D1;ASSETS:{fetch:(r:Request|string)=>Promise<Response>}};
const json=(body:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`}});
const QUERY_KEYS=['q','region','condition','kind','when','date_from','date_to','page','limit','lat','lon','radius_km'];

// Stylesheet tags of the current static build, read once per isolate from the built home page.
let styles:Promise<string>|null=null;
function styleTags(env:Env,origin:string){
  return styles??=env.ASSETS.fetch(new Request(origin+'/')).then(r=>r.text()).then(h=>(h.match(/<link rel="stylesheet"[^>]*>/g)??[]).join('')).catch(e=>{styles=null;throw e;});
}

// Data version (changes on every load), read at most once a minute per isolate.
let ver:{until:number;v:string}|null=null;
async function dataVersion(db:D1){
  if(ver&&ver.until>Date.now())return ver.v;
  const v=(await meta<string>(db,'version').catch(()=>null))??'0';ver={until:Date.now()+60e3,v};return v;
}

async function detail(req:Request,env:Env,ctx:Ctx|undefined,kind:'place'|'festival',id:string):Promise<Response|null>{
  if(!env.DB)return null;
  const version=await dataVersion(env.DB);
  const cache=(globalThis as any).caches?.default as Cache|undefined;
  const key=new Request(`https://cache.trip.internal/${version}/${kind}/${encodeURIComponent(id)}`);
  const hit=cache?await cache.match(key):undefined;if(hit)return hit;
  const p=await place(env.DB,id).catch(()=>null);
  if(!p)return null;  // not in D1 yet → static page or 404
  if((p.kind==='festival')!==(kind==='festival'))return null;
  const today=todayKST();
  const [near,st,css]=await Promise.all([
    search(env.DB,{lat:p.latitude,lon:p.longitude,radius_km:20,limit:4},today).then(r=>r.items as Place[]),
    status(env.DB).catch(()=>null),styleTags(env,new URL(req.url).origin)]);
  const res=new Response(detailHtml({place:p,nearby:near,status:st,styles:css,today}),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=600'}});
  // 1 hour at the edge; a new data version (meta.version) changes the cache key.
  if(cache)ctx?.waitUntil(cache.put(key,new Response(res.clone().body,{headers:{...Object.fromEntries(res.headers),'cache-control':'public, max-age=3600'}})));
  return res;
}

export default {
  async fetch(req:Request,env:Env,ctx?:Ctx):Promise<Response>{
    const url=new URL(req.url);
    const m=url.pathname.match(/^\/(place|festival)\/([^/]+?)(?:\.html)?$/);
    if(m&&req.method==='GET'){
      try{const r=await detail(req,env,ctx,m[1] as 'place'|'festival',decodeURIComponent(m[2]));if(r)return r;}
      catch(e){console.error('detail',e);}  // fall back to the static file
      return env.ASSETS.fetch(req);
    }
    if(url.pathname==='/api/search'){
      if(!env.DB)return json({error:'database not bound'},503,0);
      const q:Query={};for(const k of QUERY_KEYS){const v=url.searchParams.get(k);if(v!==null&&v!=='')(q as Record<string,string>)[k]=v;}
      try{return json(await search(env.DB,q),200,q.when?60:300);}catch(e){console.error('search',e);return json({error:'search failed'},500,0);}
    }
    if(url.pathname==='/api/status'){
      if(!env.DB)return json({db:false},200,0);
      const [st,version,n]=await Promise.all([status(env.DB).catch(()=>null),meta<string>(env.DB,'version').catch(()=>null),
        env.DB.prepare('SELECT kind, COUNT(*) AS n FROM places GROUP BY kind').all<{kind:string;n:number}>().then(r=>r.results).catch(()=>[])]);
      return json({db:true,version,counts:Object.fromEntries(n.map(r=>[r.kind,r.n])),status:st},200,0);
    }
    if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    return env.ASSETS.fetch(req);
  },
};
