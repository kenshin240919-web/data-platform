// Charge regions = the EV API's district codes. It uses city codes for cities split into 일반구 (수원 41110, 화성 41590),
// so weather's "시 구" entries are folded into the city; every other 시군구 keeps its own code.
import data from '../../weather/data/regions.json';

type WeatherRegion={code:string;sido:string;sidoName:string;sidoShort:string;name:string;lat:number;lon:number};
export type ChargeRegion={code:string;sido:string;sidoName:string;sidoShort:string;name:string;lat:number;lon:number;weather:string};
export const SITE='https://charge.guidejung.com';
export const WEATHER='https://weather.guidejung.com';
export const TRIP='https://trip.guidejung.com';

const groups=new Map<string,WeatherRegion[]>();
// Only 일반구 of a city ("수원시 장안구" 41111) fold into the city code; 광진구 11215·계양구 28245 keep their own code.
export const chargeCode=(r:{code:string;name:string})=>r.name.includes(' ')?r.code.slice(0,4)+'0':r.code;
for(const r of data as WeatherRegion[]){const code=chargeCode(r);groups.set(code,[...(groups.get(code)??[]),r]);}
export const regions:ChargeRegion[]=[...groups.entries()].map(([code,rs])=>({code,sido:rs[0].sido,sidoName:rs[0].sidoName,sidoShort:rs[0].sidoShort,
  name:rs.length>1?rs[0].name.split(' ')[0]:rs[0].name,lat:rs.reduce((a,r)=>a+r.lat,0)/rs.length,lon:rs.reduce((a,r)=>a+r.lon,0)/rs.length,weather:rs[0].code}));
const ORDER=['11','26','27','28','12','30','31','36','41','51','43','44','52','47','48','50'];
export const sidos=ORDER.map(code=>{const rs=regions.filter(r=>r.sido===code);return {code,name:rs[0]?.sidoName??code,short:rs[0]?.sidoShort??code,regions:rs};}).filter(s=>s.regions.length);
export const findRegion=(code:string)=>regions.find(r=>r.code===code);
export const findSido=(code:string)=>sidos.find(s=>s.code===code);
export const label=(r:ChargeRegion)=>r.sidoShort===r.name.replace(/시$/,'')?r.name:`${r.sidoShort} ${r.name}`;
export function nearby(r:ChargeRegion,count=8){return regions.filter(x=>x.code!==r.code).map(x=>({x,d:(x.lat-r.lat)**2+((x.lon-r.lon)*Math.cos(r.lat*Math.PI/180))**2})).sort((a,b)=>a.d-b.d).slice(0,count).map(({x})=>x);}
export const POPULAR=['11680','11440','11710','41590','41110','26350','50110','28260','30200','41460','11500','27260'];
