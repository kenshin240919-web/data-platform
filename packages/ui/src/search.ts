import type {Place,Results} from './types';

/** List order within the same quality score (most share 100): a photo, then a longer introduction come first,
 *  names starting with "(" ((구)·(전)·(주)…) go last; a fraction from the id mixes the rest (not 가나다 order). Same rule in scripts/build-trip-d1.mjs and export_static.py. */
export function listRank(p:{id:string;quality_score?:number|null;images?:unknown[]|null;description?:string|null;name:string}){
  let h=0;for(const c of p.id)h=(h+c.charCodeAt(0))%97;
  return h/100+(p.quality_score??0)*100+(p.images?.length?40:0)+Math.min(Math.floor((p.description??'').length/20),40)-(p.name.startsWith('(')?30:0);
}

// Port of services/api/app/main.py search(); runs at build time and in the browser.
export type Query={ended?:string|number;q?:string;region?:string;condition?:string;kind?:string;when?:string;date_from?:string;date_to?:string;page?:string|number;limit?:string|number;lat?:string|number;lon?:string|number;radius_km?:string|number};

export function todayKST(now=Date.now()){return new Date(now+9*3600_000).toISOString().slice(0,10);}
function shift(day:string,days:number){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
/** A festival whose last day has passed. Lists and search leave these out unless asked (ended=1). */
export function isEnded(p:Pick<Place,'kind'|'end_date'>,today=todayKST()){return p.kind==='festival'&&!!p.end_date&&p.end_date<today;}
export function withEventStatus(p:Place,today=todayKST()):Place{return p.start_date&&p.event_status==='scheduled'&&(p.end_date||'')<today?{...p,event_status:'ended'}:p;}

export function range(query:Query,today:string):[string,string]|null{
  if(query.when==='today')return [today,today];
  if(query.when==='weekend'){const weekday=(new Date(today+'T00:00:00Z').getUTCDay()+6)%7;const start=weekday===6?shift(today,-1):shift(today,(5-weekday+7)%7);return [start,shift(start,1)];}
  if(query.date_from||query.date_to){const start=String(query.date_from||query.date_to),end=String(query.date_to||query.date_from);return start<=end?[start,end]:null;}
  return null;
}

export function search(all:Place[],query:Query,today=todayKST()):Results{
  const limit=Math.min(50,Math.max(1,Number(query.limit)||12)),page=Math.max(1,Number(query.page)||1);
  const lat=query.lat!==undefined&&query.lat!==''?Number(query.lat):null,lon=query.lon!==undefined&&query.lon!==''?Number(query.lon):null;
  const radius=Number(query.radius_km)||20,q=(query.q||'').toLowerCase(),dates=range(query,today);
  const items:Place[]=[];
  for(const raw of all){
    const p=withEventStatus(raw,today);
    if(!query.ended&&!dates&&isEnded(p,today))continue;  // a date range (이번 주말 on Sunday) decides by itself
    if(query.kind&&!String(query.kind).split(',').includes(p.kind))continue;  // one kind or a comma list (place,festival)
    if(query.region&&p.region_id!==query.region)continue;
    if(query.condition&&p.conditions[query.condition]!==true)continue;
    if(q&&![p.name,p.address,p.region_name,p.description].join(' ').toLowerCase().includes(q))continue;
    if(dates&&(!p.start_date||!p.end_date||p.end_date<dates[0]||p.start_date>dates[1]))continue;
    let item=p;
    if(lat!==null&&lon!==null&&Number.isFinite(lat)&&Number.isFinite(lon)){
      if(p.latitude==null||p.longitude==null)continue;
      const rad=Math.PI/180,a=Math.sin((p.latitude-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(p.latitude*rad)*Math.sin((p.longitude-lon)*rad/2)**2;
      const distance=Math.round(6371*2*Math.asin(Math.min(1,Math.sqrt(a)))*100)/100;
      if(distance>radius)continue;
      item={...p,distance_km:distance};
    }
    items.push(item);
  }
  items.sort((a,b)=>(a.distance_km??0)-(b.distance_km??0)||listRank(b)-listRank(a)||(a.name<b.name?-1:a.name>b.name?1:0));
  return {items:items.slice((page-1)*limit,page*limit),total:items.length,page,pages:Math.ceil(items.length/limit),dataset_id:null,mode:'live'};
}
