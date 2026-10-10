// Build-time region helpers (pages only; the Worker imports regions.json directly).
import data from '../data/regions.json';
import type {Region} from './types';

export const regions=data as Region[];
export const SITE='https://weather.guidejung.com';
export const TRIP='https://trip.guidejung.com';

export type Sido={code:string;name:string;short:string;regions:Region[];capital:Region};
// 시도 대표 지역(도청·시청 소재지). 없으면 첫 시군구.
const CAPITALS:Record<string,string>={'11':'11140','26':'26470','27':'27110','28':'28200','12':'12240','30':'30170','31':'31140','36':'36110',
  '41':'41117','43':'43111','44':'44800','47':'47170','48':'48121','50':'50110','51':'51110','52':'52111'};
const ORDER=['11','26','27','28','12','30','31','36','41','51','43','44','52','47','48','50'];

export const sidos:Sido[]=ORDER.map(code=>{
  const rs=regions.filter(r=>r.sido===code);
  return {code,name:rs[0]?.sidoName??code,short:rs[0]?.sidoShort??code,regions:rs,capital:rs.find(r=>r.code===CAPITALS[code])??rs[0]};
}).filter(s=>s.regions.length);

export const findRegion=(code:string)=>regions.find(r=>r.code===code);
export const findSido=(code:string)=>sidos.find(s=>s.code===code);
/** Full display name: "서울 강남구". 세종처럼 시도=시군구면 하나만. */
export const label=(r:Region)=>r.sidoShort===r.name.replace(/시$/,'')?r.name:`${r.sidoShort} ${r.name}`;
/** Nearest other regions for "주변 지역" links. */
export function nearby(r:Region,count=8){
  return regions.filter(x=>x.code!==r.code).map(x=>({x,d:(x.lat-r.lat)**2+((x.lon-r.lon)*Math.cos(r.lat*Math.PI/180))**2})).sort((a,b)=>a.d-b.d).slice(0,count).map(({x})=>x);
}
export const POPULAR=['11680','11440','26350','50110','50130','51150','41117','27110','30170','28110','48121','47130'];
