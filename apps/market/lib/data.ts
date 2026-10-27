// Static build data: apps/market/data/market.json (scripts/collect-market.py, daily). Server components only.
import raw from '../data/market.json';
import {CAT_MIN,CAT_ORDER,SIDOS,located,type Cat,type Data,type Market,type StoreRow} from './fmt';
export * from './fmt';

const D=raw as unknown as Data;
export const status=D.status;
export const markets=D.markets;
export const stores=D.stores;
const zero=()=>Object.fromEntries(CAT_ORDER.map(c=>[c,0])) as Record<Cat,number>;
const add=(a:Record<Cat,number>,b:Partial<Record<Cat,number>>)=>{for(const c of CAT_ORDER)a[c]+=b[c]??0;return a;};
const byMarket=new Map<number,StoreRow[]>();
for(const s of stores)(byMarket.get(s[2])??byMarket.set(s[2],[]).get(s[2])!).push(s);
export const storesOf=(m:Market)=>byMarket.get(markets.indexOf(m))??[];
export const market=(id:string)=>markets.find(m=>m.id===id);
export const marketOf=(s:StoreRow)=>markets[s[2]];

export type Region={id:string;name:string;sido:string;zone:string;markets:Market[];n:number;d:number;new:number;cats:Record<Cat,number>;lat:number|null;lon:number|null};
const rmap=new Map<string,Market[]>();
for(const m of markets)if(m.region)(rmap.get(m.region)??rmap.set(m.region,[]).get(m.region)!).push(m);
const avg=(v:number[])=>v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(5):null;
export const regions:Region[]=[...rmap].map(([id,ms])=>{const name=ms[0].region_name!;const [sido,...rest]=name.split(' ');const pts=ms.filter(located);
  return {id,name,sido:ms[0].sido,zone:rest.join(' ')||sido,markets:[...ms].sort((a,b)=>b.n-a.n),n:ms.reduce((a,m)=>a+m.n,0),d:ms.reduce((a,m)=>a+m.d,0),new:ms.reduce((a,m)=>a+m.new,0),
    cats:ms.reduce((a,m)=>add(a,m.cats),zero()),lat:avg(pts.map(m=>m.lat!)),lon:avg(pts.map(m=>m.lon!))};})
  .sort((a,b)=>SIDOS.findIndex(s=>s[0]===a.sido)-SIDOS.findIndex(s=>s[0]===b.sido)||a.zone.localeCompare(b.zone,'ko'));
export const region=(id:string)=>regions.find(r=>r.id===id);
export const sidos=SIDOS.map(([name,slug,full])=>{const ms=markets.filter(m=>m.sido===name);
  return {name,slug,full,markets:[...ms].sort((a,b)=>b.n-a.n),regions:regions.filter(r=>r.sido===name),n:ms.reduce((a,m)=>a+m.n,0),d:ms.reduce((a,m)=>a+m.d,0),new:ms.reduce((a,m)=>a+m.new,0),cats:ms.reduce((a,m)=>add(a,m.cats),zero())};})
  .filter(s=>s.markets.length);
export const sido=(slug:string)=>sidos.find(s=>s.slug===slug);
export const nation={n:stores.length,d:status.digital,paperOnly:stores.length-status.digital,markets:markets.length,cats:markets.reduce((a,m)=>add(a,m.cats),zero()),
  new:markets.reduce((a,m)=>a+m.new,0)};
/** 지역×품목 페이지(가맹점 CAT_MIN곳 이상) */
export const regionCats=(r:Region)=>CAT_ORDER.filter(c=>c!=='etc'&&r.cats[c]>=CAT_MIN);
export const storesIn=(ms:Market[],cat?:Cat)=>ms.flatMap(m=>storesOf(m).filter(s=>!cat||s[3]===cat).map(s=>({s,m})));
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
/** 가까운 시장(위치 있는 곳만) */
export const nearMarkets=(lat:number,lon:number,km:number,skip?:string)=>{const dLat=km/111,dLon=km/(111*Math.cos(lat*Math.PI/180));
  return markets.filter(m=>located(m)&&m.id!==skip&&Math.abs(m.lat!-lat)<=dLat&&Math.abs(m.lon!-lon)<=dLon)
    .map(m=>({m,km:Math.hypot((m.lat!-lat)*111,(m.lon!-lon)*111*Math.cos(lat*Math.PI/180))})).filter(x=>x.km<=km).sort((a,b)=>a.km-b.km);};
