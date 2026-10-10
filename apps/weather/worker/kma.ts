// Pure helpers for KMA / AirKorea responses: issue times (KST) and normalization. No network here.
import type {Day,Hour} from '../lib/types';

const KST=9*3600e3;
export function kst(now=new Date()){const d=new Date(now.getTime()+KST);return {y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate(),h:d.getUTCHours(),min:d.getUTCMinutes(),date:d};}
const pad=(n:number)=>String(n).padStart(2,'0');
export function ymd(date:Date){return `${date.getUTCFullYear()}${pad(date.getUTCMonth()+1)}${pad(date.getUTCDate())}`;}
function shift(now:Date,hours:number){return new Date(now.getTime()+KST+hours*3600e3);}

/** 초단기실황: generated on the hour, served from about HH:40. */
export function nowcastBase(now=new Date()){const t=kst(now);const back=t.min<45?1:0;const d=shift(now,-back);return {date:ymd(d),time:pad(d.getUTCHours())+'00'};}

/** 단기예보: issued 02,05,…,23 and served about 10 minutes later. */
export function shortBase(now=new Date()){
  const t=kst(now);const mins=t.h*60+t.min;
  const bases=[2,5,8,11,14,17,20,23].filter(h=>mins>=h*60+15);
  if(bases.length)return {date:ymd(t.date),time:pad(bases[bases.length-1])+'00'};
  return {date:ymd(shift(now,-24)),time:'2300'};
}

/** 중기예보: issued 06 and 18. */
export function midBase(now=new Date()){
  const t=kst(now);const mins=t.h*60+t.min;
  if(mins>=18*60+15)return ymd(t.date)+'1800';
  if(mins>=6*60+15)return ymd(t.date)+'0600';
  return ymd(shift(now,-24))+'1800';
}

const num=(v:unknown)=>{const n=Number(v);return v===''||v===null||v===undefined||Number.isNaN(n)?null:n;};
type Item={category:string;fcstDate?:string;fcstTime?:string;fcstValue?:string;obsrValue?:string;baseDate?:string;baseTime?:string};

export function parseNowcast(items:Item[]){
  if(!items.length)return null;
  const v=(c:string)=>items.find(i=>i.category===c)?.obsrValue;
  return {time:`${items[0].baseDate}${items[0].baseTime}`,temp:num(v('T1H')),humidity:num(v('REH')),wind:num(v('WSD')),rain1h:v('RN1')??null,pty:num(v('PTY'))};
}

export function parseShort(items:Item[]){
  const byTime=new Map<string,Record<string,string>>();const tmin=new Map<string,number>(),tmax=new Map<string,number>();
  for(const i of items){
    const key=`${i.fcstDate}${i.fcstTime}`;const row=byTime.get(key)??{};row[i.category]=i.fcstValue??'';byTime.set(key,row);
    if(i.category==='TMN')tmin.set(i.fcstDate!,Number(i.fcstValue));
    if(i.category==='TMX')tmax.set(i.fcstDate!,Number(i.fcstValue));
  }
  const hourly:Hour[]=[...byTime.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([time,r])=>({time,temp:num(r.TMP),sky:num(r.SKY),pty:num(r.PTY),pop:num(r.POP),pcp:r.PCP??null,humidity:num(r.REH),wind:num(r.WSD)}));
  const dates=[...new Set(hourly.map(h=>h.time.slice(0,8)))];
  const daily:Day[]=dates.map(date=>{
    const hs=hourly.filter(h=>h.time.startsWith(date));const temps=hs.map(h=>h.temp).filter((t):t is number=>t!==null);
    const half=(from:number,to:number)=>{const part=hs.filter(h=>{const hh=Number(h.time.slice(8,10));return hh>=from&&hh<to;});
      const pops=part.map(h=>h.pop??0);const rep=part.find(h=>h.time.slice(8,10)===(from===0?'09':'15'))??part[0];
      return {sky:rep?skyText(rep.sky,rep.pty):'',pop:pops.length?Math.max(...pops):null};};
    return {date,min:tmin.get(date)??(temps.length?Math.min(...temps):null),max:tmax.get(date)??(temps.length?Math.max(...temps):null),am:half(0,12),pm:half(12,24),source:'short' as const};
  });
  return {hourly,daily};
}

/** 중기육상예보 + 중기기온 → days 4..10 after the issue date. */
export function parseMid(tmFc:string,land:Record<string,unknown>|undefined,ta:Record<string,unknown>|undefined):Day[]{
  if(!land||!ta)return [];
  const base=new Date(Date.UTC(+tmFc.slice(0,4),+tmFc.slice(4,6)-1,+tmFc.slice(6,8)));const days:Day[]=[];
  for(let n=4;n<=10;n++){
    const date=ymd(new Date(base.getTime()+n*864e5));
    const am=(land[`wf${n}Am`]??land[`wf${n}`]) as string|undefined;const pm=(land[`wf${n}Pm`]??land[`wf${n}`]) as string|undefined;
    if(am===undefined&&pm===undefined)continue;
    days.push({date,min:num(ta[`taMin${n}`]),max:num(ta[`taMax${n}`]),am:{sky:am??'',pop:num(land[`rnSt${n}Am`]??land[`rnSt${n}`])},pm:{sky:pm??'',pop:num(land[`rnSt${n}Pm`]??land[`rnSt${n}`])},source:'mid'});
  }
  return days;
}

export function skyText(sky:number|null,pty:number|null){
  if(pty&&pty>0)return ({1:'비',2:'비/눈',3:'눈',4:'소나기',5:'빗방울',6:'빗방울눈날림',7:'눈날림'} as Record<number,string>)[pty]??'강수';
  return ({1:'맑음',3:'구름많음',4:'흐림'} as Record<number,string>)[sky??0]??'';
}
