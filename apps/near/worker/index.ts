// near.guidejung.com Worker: /api/where (접속 지역, Cloudflare IP 위치 — 국내만) and the static pages.
interface Env{ASSETS:Fetcher}
const json=(d:unknown,status=200,cache='private, no-store')=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache}});
export default {
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    if(url.pathname==='/api/where'){const cf=(req as unknown as {cf?:{latitude?:string;longitude?:string;country?:string;city?:string}}).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
      return json(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{});}
    if(url.pathname==='/api/status')return json({ok:true},200,'public, max-age=60');
    if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,'public, max-age=3600');
    return env.ASSETS.fetch(req);
  },
};
