// D1 queries with the same rules as packages/ui/src/search.ts (kind·region·condition·검색어·날짜·반경; 거리 → 품질 → 이름).
import type {Place,Results,Status} from '../../../packages/ui/src/types';
import {range,todayKST,withEventStatus,type Query} from '../../../packages/ui/src/search';

export type D1={prepare:(sql:string)=>{bind:(...v:unknown[])=>Stmt}&Stmt};
type Stmt={all:<T=Record<string,unknown>>()=>Promise<{results:T[]}>;first:<T=Record<string,unknown>>()=>Promise<T|null>};

const CONDITIONS=new Set(['free','kids','pet','indoor']);
const like=(q:string)=>`%${q.replace(/[\\%_]/g,m=>'\\'+m)}%`;
function haversine(lat:number,lon:number,pLat:number,pLon:number){
  const rad=Math.PI/180,a=Math.sin((pLat-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(pLat*rad)*Math.sin((pLon-lon)*rad/2)**2;
  return Math.round(6371*2*Math.asin(Math.min(1,Math.sqrt(a)))*100)/100;
}

export async function search(db:D1,query:Query,today=todayKST()):Promise<Results>{
  const limit=Math.min(50,Math.max(1,Number(query.limit)||12)),page=Math.max(1,Number(query.page)||1);
  const lat=query.lat!==undefined&&query.lat!==''?Number(query.lat):null,lon=query.lon!==undefined&&query.lon!==''?Number(query.lon):null;
  const geo=lat!==null&&lon!==null&&Number.isFinite(lat)&&Number.isFinite(lon);
  const radius=Number(query.radius_km)||20,q=String(query.q||'').toLowerCase(),dates=range(query,today);
  const where:string[]=[],args:unknown[]=[];
  // Ended festivals stay out of lists and search unless asked (ended=1); their detail pages still open.
  if(!query.ended&&!dates){where.push("NOT (kind='festival' AND end_date IS NOT NULL AND end_date<?)");args.push(today);}
  if(query.kind){const ks=String(query.kind).split(',').filter(Boolean);where.push(`kind IN (${ks.map(()=>'?').join(',')})`);args.push(...ks);}  // one kind or a comma list
  if(query.region){where.push('region_id=?');args.push(query.region);}
  if(query.condition){if(!CONDITIONS.has(String(query.condition)))return {items:[],total:0,page,pages:0,dataset_id:null,mode:'live'};where.push(`${query.condition}=1`);}
  if(q){where.push("text LIKE ? ESCAPE '\\'");args.push(like(q));}
  if(dates){where.push('start_date IS NOT NULL AND end_date IS NOT NULL AND end_date>=? AND start_date<=?');args.push(dates[0],dates[1]);}
  if(geo){
    // Bounding box first (index on lat), exact distance after.
    const dLat=radius/111,dLon=radius/(111*Math.max(0.2,Math.cos(lat!*Math.PI/180)));
    where.push('lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?');args.push(lat!-dLat,lat!+dLat,lon!-dLon,lon!+dLon);
  }
  const w=where.length?`WHERE ${where.join(' AND ')}`:'';
  const card=(c:string,extra?:Partial<Place>)=>withEventStatus({...JSON.parse(c),...extra} as Place,today);
  if(geo){
    // Distances from the small columns only, then the card JSON of just this page (a 50km box near Seoul holds
    // ~10,000 rows: reading every card there took 1.5s+ per search and per detail page's nearby tabs).
    const rows=(await db.prepare(`SELECT id,lat,lon,quality,name FROM places ${w}`).bind(...args).all<{id:string;lat:number;lon:number;quality:number;name:string}>()).results;
    const hits=rows.map(r=>({r,d:haversine(lat!,lon!,r.lat,r.lon)})).filter(x=>x.d<=radius)
      .sort((a,b)=>a.d-b.d||b.r.quality-a.r.quality||(a.r.name<b.r.name?-1:a.r.name>b.r.name?1:0));
    const pageHits=hits.slice((page-1)*limit,page*limit);
    const cards=pageHits.length?new Map((await db.prepare(`SELECT id,card FROM places WHERE id IN (${pageHits.map(()=>'?').join(',')})`).bind(...pageHits.map(x=>x.r.id)).all<{id:string;card:string}>()).results.map(r=>[r.id,r.card])):new Map<string,string>();
    return {items:pageHits.filter(x=>cards.has(x.r.id)).map(x=>card(cards.get(x.r.id)!,{distance_km:x.d})),total:hits.length,page,pages:Math.ceil(hits.length/limit),dataset_id:null,mode:'live'};
  }
  const [count,rows]=await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM places ${w}`).bind(...args).first<{n:number}>(),
    db.prepare(`SELECT card FROM places ${w} ORDER BY quality DESC, name LIMIT ? OFFSET ?`).bind(...args,limit,(page-1)*limit).all<{card:string}>()]);
  const total=count?.n??0;
  return {items:rows.results.map(r=>card(r.card)),total,page,pages:Math.ceil(total/limit),dataset_id:null,mode:'live'};
}

export async function place(db:D1,id:string):Promise<Place|null>{
  const r=await db.prepare('SELECT body FROM places WHERE id=?').bind(id).first<{body:string}>();
  return r?JSON.parse(r.body) as Place:null;
}
export async function meta<T>(db:D1,key:string):Promise<T|null>{
  const r=await db.prepare('SELECT value FROM meta WHERE key=?').bind(key).first<{value:string}>();
  return r?JSON.parse(r.value) as T:null;
}
export const status=(db:D1)=>meta<Status>(db,'status');
