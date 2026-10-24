import {SITES} from '@guidejung/ui/network';
export const SITE=SITES.near.url;
export const n=(v:number)=>v.toLocaleString('ko-KR');
export const km=(v:number)=>v<1?`${Math.round(v*1000)}m`:`${v.toFixed(1)}km`;
