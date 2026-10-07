import 'server-only';
import type { Place, Region, Service, Status } from './types';
import { search, type Query } from './search';
// Static site: data comes from the export (python -m app.export_static), not a live API.
import data from '../../../apps/trip/data/trip.json';

const site=data as unknown as {status:Status;regions:Region[];sitemap:{path:string;lastmod:string}[];items:Place[]};

export function origin(service:Service){
  // Canonical/sitemap URLs are baked in at build time.
  const value=process.env[service==='home'?'HOME_PUBLIC_URL':'TRIP_PUBLIC_URL'] || `https://${service}.guidejung.com`;
  const url=new URL(value);
  if(!['localhost','127.0.0.1',`${service}.guidejung.com`].includes(url.hostname))throw new Error('기존 도메인은 신규 앱 대상이 아닙니다.');
  return url.origin;
}
export async function api<T>(path:string):Promise<T>{
  const url=new URL(path,'http://local');
  if(url.pathname==='/v1/status')return site.status as T;
  if(url.pathname==='/v1/regions')return {items:site.regions} as T;
  if(url.pathname==='/v1/sitemap')return {items:site.sitemap} as T;
  if(url.pathname==='/v1/search')return search(site.items,Object.fromEntries(url.searchParams) as Query) as T;
  const id=url.pathname.match(/^\/v1\/places\/([^/]+)$/)?.[1];
  const place=id&&site.items.find(p=>p.id===decodeURIComponent(id));
  if(place)return place as T;
  throw new Error('데이터 조회 실패 (404)');
}
export const places=()=>site.items;
/** Slim per-item fields the browser needs for cards and filtering. */
export function searchIndex(){
  return site.items.map(({id,name,kind,address,region_id,region_name,description,latitude,longitude,conditions,images,start_date,end_date,event_status,quality_score,is_demo,verified_at})=>({id,name,kind,address,region_id,region_name,description,latitude,longitude,conditions,images:images?.slice(0,1),start_date,end_date,event_status,quality_score,is_demo,verified_at}));
}
export const enabled=()=>process.env.SEO_ENABLED==='true' && site.status.mode==='live';
