// Pure helpers and types shared by server pages and client components (no snapshot import, so nothing large is bundled).
export const SITE='https://traffic.guidejung.com';
export const WEATHER='https://weather.guidejung.com';
export const TRIP='https://trip.guidejung.com';
export const CHARGE='https://charge.guidejung.com';
export type Zone=[id:string,name:string];
export type Route={no:string;name:string;start:string;end:string;E:Zone[];S:Zone[];pts?:[number,number][];dirs?:{E:string;S:string}};
export type Food={name:string;cost:string;desc:string;best:boolean};
export type Gas={gasoline:string;diesel:string;lpg:string|null;company:string;tel:string};
export type Rest={code:string;name:string;routeNo:string;route:string;lat:number;lng:number;dir:string;brands:string;facilities:string[];foods:Food[];gas:Gas|null;weather:string;charge:string;area:string};
/** "경부선" → "경부고속도로" style label people search for. */
export const roadName=(r:{name:string})=>{const base=r.name.replace(/\(.+\)$/,''),sub=r.name.match(/\(.+\)$/)?.[0]??'';return /선$/.test(base)?base.replace(/선$/,'고속도로')+sub:r.name;};
/** Direction label: city from rest areas ("서울 방향") when known, else the end IC. E runs toward the route's end, S toward its start. */
export const dirLabel=(r:Route,d:'E'|'S')=>r.dirs?`${r.dirs[d]} 방향`:`${(d==='E'?r.end:r.start).replace(/^(시점|종점)\(.+\)$/,d==='E'?'종점':'시점')} 방향`;
export const won=(s:string|null|undefined)=>{const n=Number((s??'').replace(/[^\d]/g,''));return n>0?n:null;};
export const fmtDate=(t:string)=>t?`${t.slice(0,4)}.${t.slice(4,6)}.${t.slice(6,8)}`:'';
