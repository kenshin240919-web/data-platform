// near.guidejung.com Worker: /api/where (접속 지역, Cloudflare IP 위치 — 국내만), the static pages, and the shared live APIs
// every 내근처 site calls from the browser (packages/ui/src/live.ts):
//   /api/blog?q=&must=[&src=cafe]  네이버 블로그 후기(NAVER API HUB 블로그 검색, src=cafe면 카페글 검색) — must(장소 이름)가 제목·요약에 들어간 글만 5개
//   /api/around?lat=&lon=&cat=CE7&r=500  걸어서 갈 곳(카카오 로컬 카테고리 검색: 카페·편의점·음식점) — 가까운 순 8곳
// 카카오·네이버 결과는 저장하지 않는다(약관): 방문 때마다 받아서 바로 넘기고, 응답도 no-store.
// 좌표는 장소(충전소·주차장 등)의 좌표만 받는다 — 방문자 위치는 이 API로 보내지 않는다.
interface Env{ASSETS:Fetcher;NAVER_HUB_CLIENT_ID?:string;NAVER_HUB_CLIENT_SECRET?:string;KAKAO_REST_KEY?:string}
const ORIGIN=/^https:\/\/([a-z0-9-]+\.)?guidejung\.com$/;
const json=(d:unknown,status=200,cache='private, no-store',origin='')=>new Response(JSON.stringify(d),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':cache,
  ...(origin?{'access-control-allow-origin':origin,vary:'origin'}:{})}});
const clean=(s:unknown)=>String(s??'').replace(/<[^>]+>/g,'').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
// 선정적·광고성 낱말이 든 글은 뺌(애드센스 정책 — 휴식 사이트 등).
const ADULT=/19금|성인|야한|섹시|오피|건마|스웨디시|1인샵|출장|립카페|키스방|안마방|유흥|룸살롱|노래방 ?도우미/;
const flat=(s:string)=>s.replace(/[\s()·.,\-_'"]/g,'').toLowerCase();
const CATS:Record<string,string>={CE7:'카페',CS2:'편의점',FD6:'음식점',PM9:'약국',BK9:'은행',MT1:'마트',PK6:'주차장'};

async function blog(env:Env,q:string,must:string,cafe=false){
  if(!env.NAVER_HUB_CLIENT_ID||!env.NAVER_HUB_CLIENT_SECRET)return {items:[],off:true};
  const r=await fetch(`https://naverapihub.apigw.ntruss.com/search/v1/${cafe?'cafearticle':'blog'}?${new URLSearchParams({query:q,display:'30',sort:'sim'})}`,
    {headers:{'X-NCP-APIGW-API-KEY-ID':env.NAVER_HUB_CLIENT_ID,'X-NCP-APIGW-API-KEY':env.NAVER_HUB_CLIENT_SECRET},signal:AbortSignal.timeout(6000)});
  if(!r.ok)return {items:[],error:r.status};
  const d=await r.json() as {total?:number;items?:Record<string,string>[]};
  // 이름이 흔하면(예: '중앙공원') 다른 곳 글이 섞임 → 장소 이름(띄어쓰기 무시)이 제목이나 요약에 있는 글만.
  const key=flat(must||q);
  const items=(d.items??[]).map(x=>({title:clean(x.title),desc:clean(x.description).slice(0,120),url:String(x.link??''),by:clean(cafe?x.cafename:x.bloggername),date:/^\d{8}$/.test(x.postdate??'')?`${x.postdate.slice(0,4)}.${x.postdate.slice(4,6)}.${x.postdate.slice(6)}`:''}))
    .filter(x=>/^https?:\/\//.test(x.url)).map(x=>({...x,url:x.url.replace(/^http:/,'https:')}))
    .filter(x=>!ADULT.test(x.title+x.desc)).filter(x=>!key||flat(x.title+x.desc).includes(key)).slice(0,5);
  return {items,total:d.total??0};
}

async function around(env:Env,lat:number,lon:number,cat:string,r:number){
  if(!env.KAKAO_REST_KEY)return {items:[],off:true};
  const res=await fetch(`https://dapi.kakao.com/v2/local/search/category.json?${new URLSearchParams({category_group_code:cat,x:String(lon),y:String(lat),radius:String(r),sort:'distance',size:'8'})}`,
    {headers:{Authorization:`KakaoAK ${env.KAKAO_REST_KEY}`},signal:AbortSignal.timeout(6000)});
  if(!res.ok)return {items:[],error:res.status};
  const d=await res.json() as {meta?:{total_count?:number};documents?:Record<string,string>[]};
  return {total:d.meta?.total_count??0,items:(d.documents??[]).map(x=>({name:x.place_name,cat:(x.category_name??'').split(' > ').slice(-1)[0]??'',m:Number(x.distance)||null,
    addr:x.road_address_name||x.address_name||null,tel:x.phone||null,url:x.place_url?String(x.place_url).replace(/^http:/,'https:'):null,lat:+x.y,lon:+x.x}))};
}

export default {
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    const o=req.headers.get('origin')??'',origin=ORIGIN.test(o)?o:'';
    if(url.pathname==='/api/where'){const cf=(req as unknown as {cf?:{latitude?:string;longitude?:string;country?:string;city?:string}}).cf??{};const lat=Number(cf.latitude),lon=Number(cf.longitude);
      return json(Number.isFinite(lat)&&Number.isFinite(lon)&&cf.country==='KR'?{lat,lon,city:cf.city??''}:{});}
    if(url.pathname==='/api/status')return json({ok:true,blog:!!(env.NAVER_HUB_CLIENT_ID&&env.NAVER_HUB_CLIENT_SECRET),around:!!env.KAKAO_REST_KEY},200,'public, max-age=60');
    if(url.pathname==='/api/blog'||url.pathname==='/api/around'){
      // 다른 곳에서 키를 빌려 쓰지 못하게: 브라우저 요청은 *.guidejung.com 페이지에서 온 것만.
      if(o&&!origin)return json({error:'forbidden'},403);
      try{
        if(url.pathname==='/api/blog'){const q=(url.searchParams.get('q')??'').trim().slice(0,60),must=(url.searchParams.get('must')??'').trim().slice(0,40);
          if(q.length<2)return json({error:'q'},400,'private, no-store',origin);
          return json(await blog(env,q,must,url.searchParams.get('src')==='cafe'),200,'private, no-store',origin);}
        const lat=Number(url.searchParams.get('lat')),lon=Number(url.searchParams.get('lon')),cat=url.searchParams.get('cat')??'CE7',r=Math.min(2000,Math.max(100,Number(url.searchParams.get('r'))||500));
        if(!(lat>33&&lat<39&&lon>124&&lon<132)||!CATS[cat])return json({error:'bad'},400,'private, no-store',origin);
        return json(await around(env,lat,lon,cat,r),200,'private, no-store',origin);
      }catch{return json({items:[],error:'upstream'},200,'private, no-store',origin);}
    }
    if(url.pathname.startsWith('/api/'))return json({error:'not found'},404,'public, max-age=3600');
    return env.ASSETS.fetch(req);
  },
};
