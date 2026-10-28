// Cloudflare Worker for benefit.guidejung.com (내근처 혜택). Static pages: ./out (Next.js export, 혜택 상세까지 모두 정적).
// The Worker only answers /api/where (접속 지역 — 국내 IP만, 위치 권한 전에 '우리 동네'를 대략 보여 주려고) and /api/status.
interface Env{ASSETS:Fetcher}
const json=(d:unknown,maxAge=0)=>new Response(JSON.stringify(d),{headers:{'content-type':'application/json; charset=utf-8','cache-control':maxAge?`public, max-age=${maxAge}`:'private, no-store'}});
export default {
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
      return json(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{});}
    if(url.pathname==='/api/status')return json({ok:true},60);
    if(url.pathname.startsWith('/api/'))return new Response('{"error":"not found"}',{status:404,headers:{'content-type':'application/json'}});
    return env.ASSETS.fetch(req);
  },
};
