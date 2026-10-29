// 자매 사이트 /api/* 를 브라우저에서 바로 부르는 작은 함수들(모두 CORS 허용). 하나가 실패해도 나머지 카드는 그대로 보이도록 null을 돌려준다.
import {vsYesterday} from '../../weather/lib/format';
import type {WeatherResponse} from '../../weather/lib/types';
import {SITES,type Area} from '@guidejung/ui/network';
import {fixKmNow,padLimit} from '@guidejung/ui/geo';

const U=Object.fromEntries(Object.entries(SITES).map(([k,v])=>[k,v.url])) as Record<keyof typeof SITES,string>;
export {U as SITE_URL};
async function get<T>(url:string,ms=8000):Promise<T|null>{
  const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);
  try{const r=await fetch(url,{signal:c.signal});return r.ok?fixKmNow(await r.json() as T):null;}catch{return null;}finally{clearTimeout(t);}
}
const ll=(lat:number,lon:number)=>`lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
const dist=(a:{lat:number;lon:number},lat:number,lon:number)=>{const x=(a.lon-lon)*Math.cos(lat*Math.PI/180);return Math.hypot(a.lat-lat,x)*111;};
export const nearestArea=(areas:Area[],lat:number,lon:number)=>areas.reduce((a,b)=>dist(b,lat,lon)<dist(a,lat,lon)?b:a);

type Near<T>={total:number;items:(T&{km:number})[]};
const GRADE=['','좋음','보통','나쁨','매우 나쁨'];
export async function weather(a:Area){
  const d=await get<{now?:{temp?:number;time?:string};yesterday?:{time:string;temp:number}|null;daily?:{date:string;min:number;max:number;am:{sky:string;pop:number};pm:{sky:string;pop:number}}[];air?:{pm10Grade?:number;pm25Grade?:number}}>(`${U.weather}/api/weather?code=${a.w}`,12000);
  if(!d)return null;const t=d.daily?.[0];const g=Math.max(d.air?.pm10Grade??0,d.air?.pm25Grade??0);
  return {temp:d.now?.temp??null,min:t?.min??null,max:t?.max??null,sky:t?.pm.sky??t?.am.sky??null,pop:t?Math.max(t.am.pop,t.pm.pop):null,air:GRADE[g]||null,weekend:d.daily??[],vs:vsYesterday(d as unknown as WeatherResponse)};
}
export const pharmacyOpen=(lat:number,lon:number,km=2)=>get<Near<{id:string;name:string}>>(`${U.pharmacy}/api/near?${ll(lat,lon)}&km=${km}&cond=open&limit=${padLimit(3,300)}`);
export const hospitalOpen=(lat:number,lon:number,km=2,dept?:string)=>get<Near<{id:string;name:string;div:string|null}>>(`${U.hospital}/api/near?${ll(lat,lon)}&km=${km}&cond=open&limit=${padLimit(3,300)}${dept?`&dept=${dept}`:''}`);
export const er=(lat:number,lon:number)=>get<{items:{id:string;name:string;km:number;beds:number|null;er_tel:string|null}[]}>(`${U.hospital}/api/er?${ll(lat,lon)}&limit=3`);
export async function cheapOil(lat:number,lon:number,km=3){
  const d=await get<Near<{id:string;name:string;prices:{B027?:number|null;D047?:number|null}}>>(`${U.oil}/api/near?${ll(lat,lon)}&km=${km}&limit=40`);
  if(!d)return null;const g=d.items.filter(s=>s.prices.B027).sort((a,b)=>a.prices.B027!-b.prices.B027!)[0];return {total:d.total,best:g??null};
}
export const freeParking=(lat:number,lon:number,km=1)=>get<Near<{id:string;name:string}>>(`${U.parking}/api/near?${ll(lat,lon)}&km=${km}&limit=${padLimit(50,200)}&free=1`);
export const parking=(lat:number,lon:number,km=1)=>get<Near<{id:string;name:string;charge:string}>>(`${U.parking}/api/near?${ll(lat,lon)}&km=${km}&limit=${padLimit(50,200)}`);
export async function chargers(a:Area){
  const d=await get<{stations:{chargers:{kw:number|null;type:string;stat:number}[]}[]}>(`${U.charge}/api/stations?code=${a.c}`,40000)  // 처음 보는 지역은 충전 API를 기다려 30초 넘게 걸릴 수 있음;
  if(!d)return null;let fast=0,ok=0;
  for(const s of d.stations)for(const c of s.chargers){const isFast=c.kw!=null?c.kw>=30:!['02','08'].includes(c.type);if(isFast){fast++;if(c.stat===2)ok++;}}
  return {stations:d.stations.length,fast,ok};
}
export const trip=(lat:number,lon:number,extra='',km=20,limit=3)=>get<{total?:number;items:{id:string;name:string;kind:string;region_name?:string}[]}>(`${U.trip}/api/search?${ll(lat,lon)}&radius_km=${km}&limit=${limit}${extra}`);
export const repair=(lat:number,lon:number,kind='repair',km=2)=>get<Near<{id:string;name:string;sub?:string}>>(`${U.service}/api/near?${ll(lat,lon)}&kind=${kind}&km=${km}&limit=${padLimit(3,300)}`);
const PATH:Record<string,string>={place:'place',festival:'festival',food:'food',stay:'stay',shop:'shop',course:'course'};
export const tripPath=(i:{id:string;kind:string})=>`${U.trip}/${PATH[i.kind]??'place'}/${i.id}`;
// 10/29 모아보기 16개 카드(사용자): 혜택·동물병원·시장·서류·학교·학원·휴식·고속도로. 가장 가까운 곳 이름을 보여 주는 카드는
// 서버가 칸 중심에서 자르므로 정확한 위치를 알 때는 넉넉히 받아(padLimit) 휴대폰에서 다시 줄 세운다.
export const benefit=(a:Area)=>get<{name:string;total:number;local:number;dueN:number;due:[string,string,...unknown[]][]}>(`${U.benefit}/r/${a.c}`);
export const petHospital=(lat:number,lon:number,km=2,sub='')=>get<Near<{id:string;name:string;sub:string|null;tel?:string|null}>>(`${U.pet}/api/near?${ll(lat,lon)}&km=${km}&kind=hospital${sub?`&sub=${encodeURIComponent(sub)}`:''}&limit=${padLimit(3,300)}`);
export const market=(lat:number,lon:number,km=2)=>get<{total:number;markets:{id:string;name:string;km:number;n:number}[]}>(`${U.market}/api/near?${ll(lat,lon)}&km=${km}&mlimit=${padLimit(3,200)}&limit=1`);
export const kiosk=(lat:number,lon:number,km=2)=>get<Near<{id:string;name:string;tel?:string|null}>&{open?:number}>(`${U.civil}/api/near?${ll(lat,lon)}&km=${km}&kind=kiosk&open=1&limit=${padLimit(3,300)}`);
export const school=(lat:number,lon:number,km=2)=>get<Near<{code:string;name:string;kind:string}>>(`${U.school}/api/search?${ll(lat,lon)}&km=${km}&limit=${padLimit(50,200)}`);
export const academy=(lat:number,lon:number,km=1)=>get<{total:number;items:{id:string;name:string;km:number}[]}>(`${U.academy}/api/search?${ll(lat,lon)}&km=${km}`);
export const sauna=(lat:number,lon:number,km=3)=>get<Near<{id:string;name:string}>>(`${U.rest}/api/near?${ll(lat,lon)}&km=${km}&kind=sauna&limit=${padLimit(3,300)}`);
export async function highway(){
  const d=await get<{zones:Record<string,[number,number]>}>(`${U.traffic}/api/traffic`,10000);
  if(!d)return null;let jam=0,slow=0;for(const v of Object.values(d.zones)){if(v[1]===3)jam++;else if(v[1]===2)slow++;}return {jam,slow};
}
