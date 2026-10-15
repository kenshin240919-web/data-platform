import Link from 'next/link';
import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {HomeLive} from './_components/HomeLive';
import {FoodCards,GasList} from './_components/HomeLists';
import {NearMe} from './_components/NearMe';
import regionData from '../../weather/data/regions.json';
import {RouteCards} from './_components/RouteCards';
import {MAJOR,SITE,findRoute,fmtDate,fetched,routes,rests} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:SITE+'/'}};
export default function Home(){
  const major=MAJOR.map(findRoute).filter((r):r is NonNullable<typeof r>=>!!r);
  const lite=rests.map(r=>{const f=r.foods.find(x=>x.best)??r.foods[0];return {code:r.code,name:r.name,routeNo:r.routeNo,route:r.route,area:r.area,lat:r.lat,lng:r.lng,dir:r.dir,gas:r.gas?.gasoline??'',food:f?.name??'',foodCost:Number(f?.cost)?`${Number(f!.cost).toLocaleString()}원`:''};});
  // 시군구 중심 좌표: the IP-based guess is labelled with the nearest one (Cloudflare's city name is English).
  const places=(regionData as {sidoShort:string;name:string;lat:number;lon:number}[]).map(r=>({label:r.name.startsWith(r.sidoShort)?r.name:`${r.sidoShort} ${r.name}`,lat:r.lat,lon:r.lon}));
  const foods=rests.filter(r=>r.foods.some(f=>f.best)).slice(0,60).filter((_,i)=>i%6===0).slice(0,6).map(r=>r.code);
  return <>
    <section className="section tf-top-sec"><h1>고속도로 실시간 교통상황</h1></section>
    <NearMe routes={routes} rests={lite} places={places}/>
    <section className="section"><HomeLive routes={routes} rests={lite}/></section>
    <AdSlot/>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">HIGHWAYS</div><h2>주요 고속도로</h2></div><Link href="/road">전체 {routes.length}개 노선</Link></div><RouteCards routes={major}/></section>
    <GasList rests={lite} date={fmtDate(fetched)}/>
    <FoodCards rests={lite} fallback={foods}/>
  </>;
}
