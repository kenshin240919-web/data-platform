// Cloudflare Worker for stock.guidejung.com (내근처 재고). Static pages: ./out (Next.js export — 품목 안내 글·지역 목록).
// 다이소 상품·매장 재고는 공개 중계 mcp.aka.page(다이소몰 정보, 비공식)를 방문 때만 불러 보여 주고 저장하지 않음
// (데이터센터 캐시만: 상품 검색 10분·재고 5분 — 같은 질문을 중계에 반복해서 묻지 않게).
// 올리브영(11/22): /api/oy?q=&lat=&lon= — 검색어로 찾은 위쪽 상품 3개의 주변 매장(약 10km·50곳) 재고. 좌표는 브라우저가 보낸 약 2km 칸 중심만,
//   중계가 처음엔 40초 넘게 걸려 60초 기다리고, 같은 칸·검색어는 10분 캐시.
// Routes: /api/products?q= (검색어로 상품 후보), /api/stock?id=&area= (시군구 이름으로 매장별 재고), /api/where, /api/status.
// 위치: 브라우저가 고른 시군구 이름만 받음(좌표 안 받음) — 거리 계산은 휴대폰 안에서.
import type {OyProduct,OyRes,OyStore,Product,StockRes,Store} from '../lib/fmt';
import {blockBot} from '../../../packages/ui/src/bot';

interface Env{ASSETS:Fetcher}
const AKA='https://mcp.aka.page/api/daiso',OY='https://mcp.aka.page/api/oliveyoung';
const json=(d:unknown,status=200,maxAge=60)=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':maxAge?`public, max-age=${maxAge}`:'no-store','access-control-allow-origin':'*'}});
const relay=(path:string,base=AKA,ms=15000)=>fetch(base+path,{headers:{'user-agent':'guidejung-stock (https://stock.guidejung.com)'},signal:AbortSignal.timeout(ms)})
  .then(r=>r.ok?r.json() as Promise<{success?:boolean;data?:Record<string,unknown>}>:null).then(d=>d?.success?d.data??null:null).catch(()=>null);
async function cached(req:Request,ttl:number,ctx:ExecutionContext,make:()=>Promise<unknown|null>){
  const key=new Request(new URL(req.url).toString(),{method:'GET'}),cache=(caches as unknown as {default:Cache}).default;
  const hit=await cache.match(key);if(hit)return hit;
  const v=await make();
  if(v==null)return json({error:'unavailable'},503,0);
  const res=json(v,200,ttl);ctx.waitUntil(cache.put(key,res.clone()));return res;
}
const clean=(s:unknown,max:number)=>String(s??'').replace(/[\u0000-\u001f]/g,'').trim().slice(0,max);

export default {
  async fetch(req:Request,env:Env,ctx:ExecutionContext):Promise<Response>{
    const bot=blockBot(req);if(bot)return bot;
    const url=new URL(req.url),p=url.searchParams;
    try{
      if(url.pathname==='/api/products'){const q=clean(p.get('q'),30);if(!q)return json({error:'q'},400,0);
        return await cached(req,600,ctx,async()=>{const d=await relay(`/products?q=${encodeURIComponent(q)}&limit=12`);if(!d)return null;
          const items:Product[]=((d.products??[]) as Record<string,unknown>[]).map(x=>({id:String(x.id),name:clean(x.name,80),price:typeof x.price==='number'?x.price:null,soldOut:!!x.soldOut,isNew:!!x.isNew})).filter(x=>x.id&&x.name);
          return {q,items};});}
      if(url.pathname==='/api/stock'){const id=clean(p.get('id'),20),area=clean(p.get('area'),20);
        if(!/^\d{2,12}$/.test(id)||!area)return json({error:'id/area'},400,0);
        return await cached(req,300,ctx,async()=>{const d=await relay(`/inventory?productId=${id}&keyword=${encodeURIComponent(area)}`);if(!d)return null;
          const inv=(d.storeInventory??{}) as Record<string,unknown>,prod=d.product as Record<string,unknown>|undefined;
          const stores:Store[]=((inv.stores??[]) as Record<string,unknown>[]).filter(s=>typeof s.lat==='number'&&typeof s.lng==='number').map(s=>{const o=(s.options??{}) as Record<string,unknown>;
            return {code:String(s.storeCode),name:clean(s.storeName,40),addr:clean(s.address,120),tel:s.phone?clean(s.phone,20):null,open:s.openTime?String(s.openTime):null,close:s.closeTime?String(s.closeTime):null,
              lat:s.lat as number,lon:s.lng as number,qty:typeof s.quantity==='number'?s.quantity:null,parking:!!o.parking,pickup:!!o.pickup};});
          const r:StockRes={product:prod?{id:String(prod.id),name:clean(prod.name,80)}:null,online:typeof d.onlineStock==='number'?d.onlineStock:null,
            total:stores.length,inStock:stores.filter(s=>(s.qty??0)>0).length,unknown:stores.filter(s=>s.qty==null).length,stores};
          return r;});}
      if(url.pathname==='/api/oy'){const q=clean(p.get('q'),30),lat=Number(p.get('lat')),lon=Number(p.get('lon'));
        if(!q||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<33||lat>39||lon<124||lon>132)return json({error:'q/lat/lon'},400,0);
        return await cached(req,600,ctx,async()=>{const d=await relay(`/inventory?keyword=${encodeURIComponent(q)}&lat=${lat.toFixed(4)}&lng=${lon.toFixed(4)}&storeLimit=50&stockCheckLimit=3`,OY,60000);if(!d)return null;
          const inv=(d.inventory??{}) as Record<string,unknown>,near=(d.nearbyStores??{}) as Record<string,unknown>;
          const ST:Record<string,OyStore['status']>={in_stock:'in',out_of_stock:'out',not_sold:'none'};
          const products:OyProduct[]=((inv.products??[]) as Record<string,unknown>[]).slice(0,10).map(x=>{const si=(x.storeInventory??null) as Record<string,unknown>|null;
            const stores:OyStore[]=((si?.stores??[]) as Record<string,unknown>[]).filter(s=>typeof s.latitude==='number'&&typeof s.longitude==='number').map(s=>({code:String(s.storeCode),name:clean(s.storeName,40),addr:clean(s.address,120),
              lat:s.latitude as number,lon:s.longitude as number,qty:typeof s.remainQuantity==='number'?s.remainQuantity:null,status:ST[String(s.stockStatus)]??'unknown',label:clean(s.stockLabel,20),open:typeof s.openYn==='boolean'?s.openYn:null,pickup:!!s.pickupYn}));
            const num=(v:unknown)=>typeof v==='number'?v:null;
            return {id:String(x.goodsNumber??''),name:clean(x.goodsName,100),price:num(x.priceToPay),orig:num(x.originalPrice),rate:num(x.discountRate),checked:!!si,inStock:stores.filter(s=>s.status==='in').length,stores};}).filter(x=>x.id&&x.name);
          const r:OyRes={q,total:typeof near.totalCount==='number'?near.totalCount:0,products};return r;});}
      if(url.pathname==='/api/where'){const cf=(req as unknown as {cf?:Record<string,unknown>}).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
        return new Response(JSON.stringify(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{}),{headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store'}});}
      if(url.pathname==='/api/status')return json({ok:true,source:'mcp.aka.page (daiso, oliveyoung)'},200,60);
      if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,3600);
    }catch(e){console.error(e);if(url.pathname.startsWith('/api/'))return json({error:'unavailable'},503,0);}
    return env.ASSETS.fetch(req);
  },
};
