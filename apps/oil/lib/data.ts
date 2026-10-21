// Static build data: apps/oil/data/oil.json (scripts/collect-oil.py, daily). Server components only.
import raw from '../data/oil.json';
import {distKm,type Avg,type Prod,type Station} from './fmt';
export * from './fmt';

type RegionRaw={code:string;name:string;sido:string;sido_name:string;avg:Partial<Record<Prod,Avg>>;top:string[]};
type D={status:{updated_at:string;date?:string;stations:number;today?:number;regions:number};nation:Record<string,Avg>;history:{date:string;B027?:number;D047?:number}[];
  sido:{code:string;name:string;B027?:Avg;D047?:Avg}[];regions:RegionRaw[];diesel:Record<string,string[]>;stations:Record<string,Station>};
const data=raw as unknown as D;
export const status=data.status;
export const nation=data.nation;
export const history=data.history;
export const stationMap=data.stations;
export const stations=Object.values(data.stations);
/** 오늘 받은 가격인지(최저가 목록에서 빠진 주유소는 60일 동안 마지막 가격으로 남음) */
export const fresh=(s:Station)=>!s.seen||!status.date||s.seen===status.date;
export const todayStations=stations.filter(fresh);
export const station=(id:string)=>data.stations[id];
export type Region=RegionRaw&{label:string;items:Station[];lat:number|null;lon:number|null};
const avg=(v:number[])=>v.length?+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(5):null;
export const regions:Region[]=data.regions.map(r=>{const items=r.top.map(id=>data.stations[id]).filter(Boolean);const pts=items.filter(s=>s.lat!=null);
  // 세종처럼 시도 = 시군구 하나인 곳은 이름을 한 번만.
  const label=r.name===r.sido_name||r.name.startsWith(r.sido_name)?r.name:`${r.sido_name} ${r.name}`;
  return {...r,label,items,lat:avg(pts.map(s=>s.lat!)),lon:avg(pts.map(s=>s.lon!))};}).filter(r=>r.items.length);
export const region=(code:string)=>regions.find(r=>r.code===code);
export const sido=data.sido;
export const sidos=sido.map(s=>({...s,regions:regions.filter(r=>r.sido===s.code)})).filter(s=>s.regions.length);
export const sidoByCode=(code:string)=>sidos.find(s=>s.code===code);
export const diesel=(code:string)=>(data.diesel[code]??[]).map(id=>data.stations[id]).filter(Boolean);
export const price=(s:Station,p:Prod='B027')=>s.prices[p]??null;
/** 전국 최저가(휘발유·경유): 모은 주유소 가운데 가격 낮은 순 */
export const cheapest=(p:Prod,limit=10)=>todayStations.filter(s=>price(s,p)!=null).sort((a,b)=>price(a,p)!-price(b,p)!).slice(0,limit);
export const regionOf=(s:Station)=>s.region?region(s.region):undefined;
/** 같은 시군구 최저가 목록에서의 순위(1부터, 휘발유) */
export const rankIn=(s:Station)=>{const r=regionOf(s);const i=r?r.top.indexOf(s.id):-1;return i<0?null:i+1;};
export const nearby=(s:Station,limit=6,maxKm=10)=>s.lat==null?[]:todayStations.filter(x=>x.id!==s.id&&x.lat!=null)
  .map(x=>({...x,km:Math.round(distKm(s.lat!,s.lon!,x.lat!,x.lon!)*100)/100})).filter(x=>x.km<=maxKm).sort((a,b)=>a.km-b.km).slice(0,limit);
export const updated=()=>{const d=new Date(status.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
/** 브라우저로 보내는 가벼운 카드 */
export const slim=(s:Station)=>({id:s.id,name:s.name,brand:s.brand,self:s.self,address:s.address,lat:s.lat,lon:s.lon,prices:s.prices});
