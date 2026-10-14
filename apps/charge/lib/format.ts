// Status, charger type and distance wording (client side). Codes follow the 한국환경공단 EV API.
import type {Charger,Station} from './types';

export const STAT:Record<number,{text:string;tone:'ok'|'busy'|'off'}>={1:{text:'통신이상',tone:'off'},2:{text:'사용 가능',tone:'ok'},3:{text:'충전 중',tone:'busy'},4:{text:'운영중지',tone:'off'},5:{text:'점검 중',tone:'off'},9:{text:'상태 미확인',tone:'off'}};
const TYPES:Record<string,string>={'01':'DC차데모','02':'AC완속','03':'DC차데모+AC3상','04':'DC콤보','05':'DC차데모+DC콤보','06':'DC차데모+AC3상+DC콤보','07':'AC3상','08':'DC콤보(완속)'};
export const typeName=(t:string)=>TYPES[t]??'기타';
/** 급속: 출력 30kW 이상(출력 정보가 없으면 타입으로 판단). */
export const isFast=(c:Charger)=>c.kw!==null?c.kw>=30:!['02','08'].includes(c.type);
export function summary(s:Station){
  const ok=s.chargers.filter(c=>c.stat===2),busy=s.chargers.filter(c=>c.stat===3);
  const fast=s.chargers.filter(isFast),fastOk=fast.filter(c=>c.stat===2);
  const tone=ok.length?(ok.length===s.chargers.length?'ok':'some'):busy.length?'busy':'off';
  return {ok:ok.length,busy:busy.length,total:s.chargers.length,fast:fast.length,fastOk:fastOk.length,tone,maxKw:Math.max(0,...s.chargers.map(c=>c.kw??0))};
}
export const TONE_LABEL={ok:'🟢 모두 비어 있음',some:'🟡 일부 사용 가능',busy:'🔴 모두 충전 중',off:'⚫ 이용 불가·확인 필요'} as const;
export function distanceKm(aLat:number,aLon:number,bLat:number,bLon:number){
  const r=Math.PI/180,dLat=(bLat-aLat)*r,dLon=(bLon-aLon)*r;const h=Math.sin(dLat/2)**2+Math.cos(aLat*r)*Math.cos(bLat*r)*Math.sin(dLon/2)**2;return 12742*Math.asin(Math.sqrt(h));
}
export const fmtKm=(km:number)=>km<1?`${Math.round(km*1000)}m`:`${km.toFixed(1)}km`;
export function ago(ts:string){
  if(!/^\d{14}$/.test(ts))return '';
  const t=Date.UTC(+ts.slice(0,4),+ts.slice(4,6)-1,+ts.slice(6,8),+ts.slice(8,10)-9,+ts.slice(10,12));const m=Math.round((Date.now()-t)/60000);
  return m<1?'방금':m<60?`${m}분 전`:m<1440?`${Math.round(m/60)}시간 전`:`${Math.round(m/1440)}일 전`;
}
export const is24h=(s:Station)=>/24/.test(s.useTime);
