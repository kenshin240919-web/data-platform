// Cloudflare Worker for trip.guidejung.com: static pages from apps/trip/out, places from D1 (guidejung-trip).
// /place|festival|food|stay|course|shop/{id}: rendered from D1 (cached per data version), 404 page when the place is not there.
// /api/search: the site search on D1. /api/status: data version and counts.
// /sitemap.xml (index) → /sitemap-pages.xml + /sitemap-places-{n}.xml (40,000 each), /rss.xml: from D1 as well.
import type {Place} from '../../../packages/ui/src/types';
import {todayKST,type Query} from '../../../packages/ui/src/search';
import {detailPath} from '../../../packages/ui/src/kinds';
import {meta,place,search,status,type D1} from './db';
import {detailHtml} from './render';
import {rssXml} from '../../../packages/ui/src/rss';

type Ctx={waitUntil:(p:Promise<unknown>)=>void};
type Env={DB?:D1;ASSETS:{fetch:(r:Request|string)=>Promise<Response>}};
// Readable from the sister sites (weather·charge·traffic show nearby trip places): public data, no cookies.
const json=(body:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const QUERY_KEYS=['ended','q','region','condition','kind','when','date_from','date_to','page','limit','lat','lon','radius_km'];

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

async function detail(req:Request,env:Env,ctx:Ctx|undefined,kind:string,id:string):Promise<Response|null>{
  if(!env.DB)return null;
  // The stylesheet tags carry the build's hashed file names: a new deploy (new page code) also gets a new cache key.
  const [version,css]=await Promise.all([dataVersion(env.DB),styleTags(env,new URL(req.url).origin)]);
  const build=css.match(/[\w-]+\.css/)?.[0]??'';
  const cache=(globalThis as any).caches?.default as Cache|undefined;
  // encode: the version ends in '#s2', and a raw '#' would cut the rest of the key off (every page under one key).
  const key=new Request(`https://cache.trip.internal/${encodeURIComponent(version)}/${build}/${kind}/${encodeURIComponent(id)}`);
  const hit=cache?await cache.match(key):undefined;if(hit)return hit;
  const p=await place(env.DB,id).catch(()=>null);
  if(!p)return null;  // not in D1 yet → static page or 404
  if(p.kind!==kind)return null;
  // 여행코스: link each stop that is in the data to its page.
  const stops=(p.course_steps??[]).map(s=>s.id).filter((x):x is string=>!!x);
  if(stops.length){
    const rows=(await env.DB.prepare(`SELECT id,kind FROM places WHERE id IN (${stops.map(()=>'?').join(',')})`).bind(...stops).all<{id:string;kind:string}>().catch(()=>({results:[]}))).results;
    const by=new Map(rows.map(r=>[r.id,detailPath(r)]));
    p.course_steps=p.course_steps!.map(s=>({...s,path:s.id?by.get(s.id):undefined}));
  }
  const today=todayKST();
  // Nearby by kind (가볼만한곳·맛집·숙소·다가오는 축제), 8 each within 20km + how many there are; empty groups are not shown.
  const near=(k:string,extra:Query={})=>search(env.DB!,{lat:p.latitude,lon:p.longitude,radius_km:20,limit:9,kind:k,...extra},today).then(r=>{const self=r.items.some(i=>i.id===p.id);return {kind:k,items:r.items as Place[],total:r.total-(self?1:0)};});
  const soon=new Date(Date.now()+(9*3600+90*86400)*1000).toISOString().slice(0,10);
  const [groups,st]=await Promise.all([
    Promise.all([near('place'),near('food'),near('stay'),near('festival',{date_from:today,date_to:soon}),near('shop'),near('course')]).then(g=>g.map(x=>({...x,items:x.items.filter(i=>i.id!==p.id).slice(0,8)}))),
    status(env.DB).catch(()=>null)]);
  const res=new Response(detailHtml({place:p,nearby:groups,status:st,styles:css,today}),{headers:{'content-type':'text/html; charset=utf-8','cache-control':'public, max-age=600'}});
  // 1 hour at the edge; a new data version (meta.version) or deploy changes the cache key.
  if(cache)ctx?.waitUntil(cache.put(key,new Response(res.clone().body,{headers:{...Object.fromEntries(res.headers),'cache-control':'public, max-age=3600'}})));
  return res;
}

const ORIGIN='https://trip.guidejung.com';
const PER_SITEMAP=40000;
// Same list pages the static build marks index (packages/ui/src/index.tsx INDEXED_LISTS).
const LISTS=['region','place','festival','free','kids','pet','indoor'];
const xml=(body:string,maxAge=3600)=>new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${body}\n`,{headers:{'content-type':'application/xml; charset=utf-8','cache-control':`public, max-age=${maxAge}`}});
const urlset=(rows:{loc:string;lastmod?:string|null}[])=>xml(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.map(r=>`<url><loc>${r.loc}</loc>${r.lastmod?`<lastmod>${new Date(r.lastmod).toISOString()}</lastmod>`:''}</url>`).join('')}</urlset>`);
async function seoOn(db:D1){const st=await status(db).catch(()=>null);return st&&st.seo_enabled&&st.mode==='live'&&st.available?st:null;}

async function sitemap(db:D1,path:string):Promise<Response|null>{
  const st=await seoOn(db);
  if(!st)return path==='/sitemap.xml'||path==='/sitemap-pages.xml'||/^\/sitemap-places-\d+\.xml$/.test(path)?urlset([]):null;
  if(path==='/sitemap.xml'){
    const n=(await db.prepare('SELECT COUNT(*) AS n FROM places WHERE indexable=1').first<{n:number}>())?.n??0;
    const files=['/sitemap-pages.xml',...Array.from({length:Math.ceil(n/PER_SITEMAP)},(_,i)=>`/sitemap-places-${i+1}.xml`)];
    return xml(`<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${files.map(f=>`<sitemap><loc>${ORIGIN}${f}</loc>${st.updated_at?`<lastmod>${new Date(st.updated_at).toISOString()}</lastmod>`:''}</sitemap>`).join('')}</sitemapindex>`);
  }
  if(path==='/sitemap-pages.xml'){
    const regions=(await db.prepare('SELECT id FROM regions ORDER BY name').all<{id:string}>()).results;
    // 맛집·숙소 list pages only once there are any.
    const extra=(await db.prepare("SELECT DISTINCT kind FROM places WHERE kind IN ('food','stay','course','shop')").all<{kind:string}>()).results.map(r=>r.kind);
    return urlset([{loc:ORIGIN+'/',lastmod:st.updated_at},...[...LISTS,...extra].map(k=>({loc:`${ORIGIN}/${k}`,lastmod:st.updated_at})),...regions.map(r=>({loc:`${ORIGIN}/region/${r.id}`,lastmod:st.updated_at}))]);
  }
  const m=path.match(/^\/sitemap-places-(\d+)\.xml$/);if(!m)return null;
  const rows=(await db.prepare('SELECT id,kind,updated FROM places WHERE indexable=1 ORDER BY id LIMIT ? OFFSET ?').bind(PER_SITEMAP,(Number(m[1])-1)*PER_SITEMAP).all<{id:string;kind:string;updated:string|null}>()).results;
  return urlset(rows.map(r=>({loc:ORIGIN+detailPath(r),lastmod:r.updated})));
}

export default {
  async fetch(req:Request,env:Env,ctx?:Ctx):Promise<Response>{
    const url=new URL(req.url);
    // Detail ids have no dots; other files under /place/ (Next.js list-page data such as __next._tree.txt) are static.
    const m=url.pathname.match(/^\/(place|festival|food|stay|course|shop)\/([^/.]+)(?:\.html)?$/);
    if(m&&req.method==='GET'){
      try{const r=await detail(req,env,ctx,m[1],decodeURIComponent(m[2]));if(r)return r;}
      catch(e){console.error('detail',e);}
      // Not in D1 (or D1 failed): the static 404 page. Detail pages are no longer built statically.
      return env.ASSETS.fetch(new Request(new URL('/404',req.url))).then(r=>new Response(r.body,{status:404,headers:r.headers}));
    }
    // Approximate visitor position from Cloudflare's IP geolocation (Korea only), for the first screen before any prompt.
    if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
      return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
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
    if(env.DB&&/^\/sitemap(-pages|-places-\d+)?\.xml$/.test(url.pathname)){
      try{const r=await sitemap(env.DB,url.pathname);if(r)return r;}catch(e){console.error('sitemap',e);}
      return env.ASSETS.fetch(req);
    }
    if(env.DB&&url.pathname==='/rss.xml'){
      // Newest 500 source changes (the static feed had every page; tens of thousands is too long for a feed).
      try{
        if(!await seoOn(env.DB))return new Response(rssXml([],ORIGIN),{headers:{'content-type':'application/rss+xml; charset=utf-8'}});
        const rows=(await env.DB.prepare('SELECT body FROM places WHERE indexable=1 ORDER BY changed DESC LIMIT 500').all<{body:string}>()).results;
        return new Response(rssXml(rows.map(r=>JSON.parse(r.body) as Place),ORIGIN),{headers:{'content-type':'application/rss+xml; charset=utf-8','cache-control':'public, max-age=3600'}});
      }catch(e){console.error('rss',e);return env.ASSETS.fetch(req);}
    }
    if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    return env.ASSETS.fetch(req);
  },
};
