// Cloudflare Worker for oil.guidejung.com (내근처 주유소). Static pages: ./out (Next.js export, 주유소 상세 포함).
// The price file ships with the Worker (data/oil.json, scripts/collect-oil.py once a day — 오피넷 하루 300회 한도라
// 방문자 요청마다 오피넷을 부르지 않음), imported as text (wrangler.jsonc rules) and parsed on first use.
// Routes: /api/near (내 주변 최저가), /api/where, /api/status.
import raw from '../data/oil.json';
import {distKm,type Card,type Prod,type Station} from '../lib/fmt';

interface Env{ASSETS:Fetcher}
type Data={status:{updated_at:string;date?:string;stations:number};stations:Record<string,Station>};
let parsed:Data|null=null,list:Station[]|null=null;
const data=()=>parsed??=(typeof raw==='string'?JSON.parse(raw):raw) as Data;
// 오늘 받은 가격만(60일 동안 남겨 둔 지난 주유소는 상세 페이지에서만)
const today=()=>list??=Object.values(data().stations).filter(s=>s.lat!=null&&(!s.seen||!data().status.date||s.seen===data().status.date));
const json=(d:unknown,status=200,maxAge=600)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':`public, max-age=${maxAge}`,'access-control-allow-origin':'*'}});
const num=(v:string|null)=>v!==null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;

function near(lat:number,lon:number,radius:number,prod:Prod,limit:number){
  const dLat=radius/111,dLon=radius/(111*Math.cos(lat*Math.PI/180));const out:Card[]=[];
  for(const s of today()){
    if(s.prices[prod]==null||Math.abs(s.lat!-lat)>dLat||Math.abs(s.lon!-lon)>dLon)continue;
    const d=distKm(lat,lon,s.lat!,s.lon!);if(d<=radius)out.push({...s,km:Math.round(d*100)/100});
  }
  // 싼 순(같으면 가까운 순)으로 고른 뒤 화면에서 거리순으로 보여 줌
  out.sort((a,b)=>a.prices[prod]!-b.prices[prod]!||a.km!-b.km!);
  return {total:out.length,items:out.slice(0,limit)};
}

export default {
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/near'){const lat=num(p.get('lat')),lon=num(p.get('lon'));
        if(lat==null||lon==null||Math.abs(lat-36)>6||Math.abs(lon-128)>6)return json({error:'lat/lon'},400,60);
        const prod=(p.get('prod')==='D047'?'D047':'B027') as Prod;
        return json({...near(lat,lon,Math.min(Math.max(num(p.get('km'))??3,0.5),30),prod,Math.min(num(p.get('limit'))??12,50)),updated:data().status.updated_at});}
      if(url.pathname==='/api/where'){const cf=(req as any).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({status:data().status,today:today().length},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    }catch(e){return json({error:String(e)},500,0);}
    return env.ASSETS.fetch(req);
  },
};
