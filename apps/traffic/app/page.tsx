import Link from 'next/link';
import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {HomeLive} from './_components/HomeLive';
import {FoodCards,GasList} from './_components/HomeLists';
import {NearMe} from './_components/NearMe';
import {Connect,genericFor} from '@guidejung/ui/network';
import regionData from '../../weather/data/regions.json';
import {RouteCards} from './_components/RouteCards';
import {MAJOR,SITE,findRoute,fmtDate,fetched,gasStat,roadName,routes,rests,won} from '../lib/data';
import {Faq,ga} from '@guidejung/ui/seo';

export const metadata:Metadata={alternates:{canonical:SITE+'/'}};
export default function Home(){
  const major=MAJOR.map(findRoute).filter((r):r is NonNullable<typeof r>=>!!r);
  const lite=rests.map(r=>{const f=r.foods.find(x=>x.best)??r.foods[0];return {code:r.code,name:r.name,routeNo:r.routeNo,route:r.route,area:r.area,lat:r.lat,lng:r.lng,dir:r.dir,gas:r.gas?.gasoline??'',food:f?.name??'',foodCost:Number(f?.cost)?`${Number(f!.cost).toLocaleString()}원`:''};});
  // 시군구 중심 좌표: the IP-based guess is labelled with the nearest one (Cloudflare's city name is English).
  const places=(regionData as {code:string;sidoShort:string;name:string;lat:number;lon:number}[]).map(r=>({code:r.code,charge:r.name.includes(' ')?r.code.slice(0,4)+'0':r.code,label:r.name.startsWith(r.sidoShort)?r.name:`${r.sidoShort} ${r.name}`,lat:r.lat,lon:r.lon}));
  const foods=rests.filter(r=>r.foods.some(f=>f.best)).slice(0,60).filter((_,i)=>i%6===0).slice(0,6).map(r=>r.code);
  return <>
    <section className="section tf-top-sec"><h1>고속도로 실시간 교통상황</h1></section>
    <NearMe routes={routes} rests={lite} places={places}/>
    <section className="section"><HomeLive routes={routes} rests={lite}/></section>
    <AdSlot/>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">HIGHWAYS</div><h2>주요 고속도로</h2></div><Link href="/road">전체 {routes.length}개 노선</Link></div><RouteCards routes={major}/></section>
    <GasList rests={lite} date={fmtDate(fetched)}/>
    <FoodCards rests={lite} fallback={foods}/>
    <Connect title="떠나기 전에 함께 보기" items={genericFor('traffic')}/>
    <Faq items={[
      ['지금 고속도로 어디가 막히나요?','위 "지금 가장 막히는 구간 TOP 10"에서 한국도로공사 실시간 소통 정보를 5분마다 받아 전국 고속도로의 정체·서행 구간을 보여 드립니다. 위치를 허용하면 내 근처 고속도로부터 보여 드립니다.'],
      ['어떤 고속도로 정보를 볼 수 있나요?',`전국 고속도로 ${routes.length}개 노선의 구간별 양방향 속도와 CCTV, 휴게소 ${rests.length}곳의 대표 음식·기름값·편의시설, 사고·공사 정보를 볼 수 있습니다.`],
      [`고속도로 휴게소 중 휘발유가 가장 싼 곳은 어디인가요?`,(()=>{const g=gasStat('gasoline');const c=g.list[0];return c?`${fmtDate(fetched)} 한국도로공사 자료 기준 ${roadName({name:c.route})} ${c.dir?`${c.dir} 방향 `:''}${ga(c.name)} ${won(c.gas!.gasoline)!.toLocaleString()}원으로 가장 쌉니다. 전국 휴게소 평균은 ${g.avg.toLocaleString()}원입니다.`:'';})()],
      [`고속도로 휴게소 중 경유가 가장 싼 곳은 어디인가요?`,(()=>{const g=gasStat('diesel');const c=g.list[0];return c?`${roadName({name:c.route})} ${c.dir?`${c.dir} 방향 `:''}${ga(c.name)} ${won(c.gas!.diesel)!.toLocaleString()}원으로 가장 쌉니다. 전국 휴게소 평균은 ${g.avg.toLocaleString()}원입니다.`:'';})()],
      ['고속도로 CCTV는 어디서 보나요?','노선 페이지에서 내 위치와 가까운 CCTV부터 영상을 볼 수 있습니다. 영상은 국가교통정보센터에서 제공합니다.']]}/>
  </>;
}
