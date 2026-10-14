// Daily snapshot (scripts/collect-traffic-snapshot.py): highway routes in 구간 order and rest areas.
import data from '../data/snapshot.json';
import {won,type Rest,type Route} from './format';
export * from './format';

const snap=data as {fetched:string;routes:Route[];rests:Rest[]};
export const fetched=snap.fetched;
/** Routes with the most 구간 first (경부선·중부내륙선 …): the order people browse in. */
export const routes=[...snap.routes].sort((a,b)=>(b.E.length+b.S.length)-(a.E.length+a.S.length));
export const rests=snap.rests;
export const findRoute=(no:string)=>snap.routes.find(r=>r.no===no);
export const findRest=(code:string)=>rests.find(r=>r.code===code);
export const restsOn=(no:string)=>rests.filter(r=>r.routeNo===no);
/** Rest areas with a fuel price, cheapest 휘발유 first. */
export const cheapGas=()=>rests.filter(r=>won(r.gas?.gasoline)).sort((a,b)=>won(a.gas!.gasoline)!-won(b.gas!.gasoline)!);
export const MAJOR=['0010','0150','1000','0100','0500','0251','0450','0550','0352','0600','0351','0120'];
