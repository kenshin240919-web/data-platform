// Cloudflare Worker for movie.guidejung.com (내근처 영화관). Static pages (극장·지역·체인 — LOCALDATA): ./out (Next.js export).
// The theater list ships with the Worker (data/theaters.json, scripts/collect-movie.py), imported as text, parsed on first use.
// Routes: /api/near, /api/search, /api/where, /api/status,
//   /api/showtimes?id= — 오늘 남은 상영·남은 좌석: 공개 중계 mcp.aka.page(CGV·롯데시네마·메가박스 앱 정보, 비공식)를 방문 때 불러
//     5분 데이터센터 캐시만(저장·수집 안 함). 우리 극장 좌표로 중계의 가까운 극장(500m 안)을 찾아 그 극장 코드로 시간표.
//   /api/boxoffice — KOBIS 일별 박스오피스: 약관 제6조 ②(실시간만, 저장·복제 금지) → 캐시 없이(no-store) 방문 때마다 1회 호출,
//     하루 3,000회 한도. 다른 정보와 섞지 않고 따로 보여 주고 '영화진흥위원회 통합전산망 오픈 API' 출처를 붙임(화면 쪽).
import raw from '../data/theaters.json';
import {CHAINS,distKm,slim,type ChainKey,type Show,type Theater} from '../lib/fmt';

interface Env{ASSETS:Fetcher;KOBIS_API_KEY?:string}
type Data={status:{updated_at:string;count:number};items:Theater[]};
let parsed:Data|null=null,byId:Map<string,Theater>|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
const get=(id:string)=>(byId??=new Map(data().items.map(p=>[p.id,p]))).get(id);
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':maxAge?`public, max-age=${maxAge}`:'no-store','access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const flat=(s:string)=>s.replace(/\s+/g,'').toLowerCase();

function near(lat:number,lon:number,radius:number,opt:{limit?:number;chain?:ChainKey|null}){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180));
  const out:(Theater&{km:number})[]=[];
  for(const p of data().items){
    if(p.lat==null||Math.abs(p.lat-lat)>dLat||Math.abs(p.lon!-lon)>dLon)continue;
    if(opt.chain&&p.chain!==opt.chain)continue;
    const d=distKm(lat,lon,p.lat,p.lon!);if(d>radius)continue;
    out.push({...p,km:Math.round(d*100)/100});
  }
  out.sort((a,b)=>a.km-b.km);
  return {total:out.length,items:out.slice(0,opt.limit??60)};
}

// ---- 실시간 시간표(aka.page) -------------------------------------------------------------------------------------------
const AKA='https://mcp.aka.page/api';
const UA={headers:{'user-agent':'guidejung-movie (https://movie.guidejung.com)'}};
const relay=(path:string,ms=18000)=>fetch(AKA+path,{...UA,signal:AbortSignal.timeout(ms)}).then(r=>r.ok?r.json() as Promise<{success?:boolean;data?:Record<string,unknown>}>:null).then(d=>d?.success?d.data??null:null).catch(()=>null);
const PATHS:Partial<Record<ChainKey,{list:string;code:string;times:(code:string)=>string}>>={
  cgv:{list:'/cgv/theaters',code:'theaterCode',times:c=>`/cgv/timetable?theaterCode=${c}`},
  lotte:{list:'/lottecinema/theaters',code:'theaterId',times:c=>`/lottecinema/movies?theaterId=${c}`},
  mega:{list:'/megabox/theaters',code:'theaterId',times:c=>`/megabox/movies?theaterId=${c}`},
};
type Raw={movieName?:string;startTime?:string;endTime?:string;remainingSeats?:number;totalSeats?:number;screenName?:string};
/** 응답 안에서 startTime이 있는 배열(시간표)을 찾음 — 체인마다 이름이 다름(timetable·showtimes·…). */
const showsOf=(d:Record<string,unknown>):Show[]=>{
  const arr=Object.values(d).find(v=>Array.isArray(v)&&v.length&&typeof (v[0] as Raw).startTime==='string') as Raw[]|undefined;
  return (arr??[]).filter(s=>s.movieName&&s.startTime).map(s=>({movie:s.movieName!.trim(),start:s.startTime!,end:s.endTime??null,
    left:typeof s.remainingSeats==='number'?s.remainingSeats:null,total:typeof s.totalSeats==='number'?s.totalSeats:null,screen:s.screenName??null}))
    .sort((a,b)=>a.start.localeCompare(b.start));
};
async function cached(key:string,ttl:number,ctx:ExecutionContext,make:()=>Promise<unknown|null>){
  const req=new Request(`https://movie.guidejung.com/__cache/${key}`),cache=(caches as unknown as {default:Cache}).default;
  const hit=await cache.match(req);if(hit)return hit.json();
  const v=await make();
  if(v!=null)ctx.waitUntil(cache.put(req,new Response(JSON.stringify(v),{headers:{'cache-control':`public, max-age=${ttl}`}})));
  return v;
}
async function showtimes(t:Theater,ctx:ExecutionContext){
  const p=PATHS[t.chain];
  if(!p||t.lat==null)return {live:false,shows:[]};
  // 중계 쪽 극장 코드: 우리 극장 좌표에서 가장 가까운 같은 체인 극장(500m 안). 하루 캐시(코드표를 모아 두지는 않음).
  const code=await cached(`code/v1/${t.id}`,86400,ctx,async()=>{
    const d=await relay(`${p.list}?lat=${t.lat}&lng=${t.lon}&limit=3`);
    const list=(d?.theaters??[]) as Record<string,unknown>[];
    const best=list.map(x=>({c:String(x[p.code]??''),k:typeof x.latitude==='number'?distKm(t.lat!,t.lon!,x.latitude as number,x.longitude as number):99,name:String(x.theaterName??'')}))
      .filter(x=>x.c&&x.k<0.5).sort((a,b)=>a.k-b.k)[0];
    return best?{c:best.c,name:best.name}:d?{c:''}:null; // 못 찾음은 하루 기억, 중계 실패는 기억 안 함
  }) as {c:string;name?:string}|null;
  if(!code)return {live:true,error:'relay'};
  if(!code.c)return {live:false,shows:[]};
  const shows=await cached(`times/v1/${t.id}/${new Date(Date.now()+9*3600e3).toISOString().slice(0,10)}`,300,ctx,async()=>{
    const d=await relay(p.times(code.c),20000);return d?showsOf(d):null;
  }) as Show[]|null;
  return shows?{live:true,shows,src:CHAINS[t.chain].label}:{live:true,error:'relay'};
}

// ---- KOBIS 박스오피스(실시간만) -----------------------------------------------------------------------------------------
async function boxoffice(env:Env){
  if(!env.KOBIS_API_KEY)return json({error:'no key'},503,0);
  const day=new Date(Date.now()+9*3600e3-86400e3).toISOString().slice(0,10).replace(/-/g,'');
  const r=await fetch(`https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/searchDailyBoxOfficeList.json?key=${env.KOBIS_API_KEY}&targetDt=${day}`,{signal:AbortSignal.timeout(10000)}).catch(()=>null);
  const d=r?.ok?await r.json().catch(()=>null) as {boxOfficeResult?:{dailyBoxOfficeList?:Record<string,string>[]}}|null:null;
  const list=d?.boxOfficeResult?.dailyBoxOfficeList;
  if(!list)return json({error:'unavailable'},503,0);
  // 받은 그대로(순위·영화명·개봉일·관객 수)만 넘김 — 저장·가공 저장 없음.
  return json({date:day,rows:list.map(x=>({rank:x.rank,name:x.movieNm,open:x.openDt,audi:x.audiCnt,acc:x.audiAcc,inten:x.rankInten,isNew:x.rankOldAndNew==='NEW'}))},200,0);
}

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));if(lat===null||lon===null)return json({error:'lat/lon'},400,0);
        const c=p.get('chain') as ChainKey|null;
        const r=near(lat,lon,Math.max(.5,Math.min(50,num(p.get('km'))??5)),{limit:Math.max(1,Math.min(300,num(p.get('limit'))??60)),chain:c&&c in CHAINS?c:null});
        return json({total:r.total,items:r.items.map(x=>({...slim(x),km:x.km}))},200,300);}
      if(url.pathname==='/api/showtimes'){const t=get(p.get('id')??'');if(!t)return json({error:'not found'},404,60);
        const r=await showtimes(t,ctx);return json(r,200,'error' in r?0:120);}
      if(url.pathname==='/api/boxoffice')return await boxoffice(env);
      if(url.pathname==='/api/search'){const q=flat(p.get('q')??'').slice(0,30);if(!q)return json({total:0,items:[]});
        const words=(p.get('q')??'').trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,4).map(flat);
        const hit=data().items.filter(x=>{const name=flat(x.name),where=flat(x.region_name+(x.addr??'')+(x.jibun??'')+CHAINS[x.chain].title);return words.every(w=>name.includes(w)||where.includes(w));});
        const score=(x:Theater)=>{const name=flat(x.name);return name.startsWith(q)?0:name.includes(q)?1:2;};
        hit.sort((a,b)=>score(a)-score(b)||a.name.localeCompare(b.name));
        return json({total:hit.length,items:hit.slice(0,40).map(slim)},200,600);}
      if(url.pathname==='/api/where'){const cf=(req as unknown as {cf?:Record<string,unknown>}).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:data().status,kobis:!!env.KOBIS_API_KEY},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
