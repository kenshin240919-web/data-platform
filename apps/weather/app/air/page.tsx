import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import stations from '../../data/air-stations.json';
import {AirBoard} from '../_components/AirBoard';
import {label,regions,SITE} from '../../lib/regions';

export const metadata:Metadata={title:'오늘 미세먼지 - 전국 실시간 순위',description:'전국 미세먼지·초미세먼지 실시간 측정값. 지금 공기 가장 깨끗한 곳과 나쁜 곳 TOP 10, 시도별 평균을 확인하세요.',alternates:{canonical:SITE+'/air'}};
export default function AirPage(){
  // 측정소마다 가장 가까운 시군구를 미리 정해 두고, 순위 항목을 그 지역 날씨 페이지로 연결한다.
  const places:Record<string,{code:string;label:string}>={};
  for(const s of stations as {name:string;lat:number;lon:number}[]){
    const r=regions.reduce((a,b)=>((b.lat-s.lat)**2+(b.lon-s.lon)**2)<((a.lat-s.lat)**2+(a.lon-s.lon)**2)?b:a);
    places[s.name]={code:r.code,label:label(r)};
  }
  return <section className="section"><div className="eyebrow">AIR QUALITY</div><h1>오늘 전국 미세먼지</h1><AirBoard places={places}/><AdSlot/>
    <div className="prose"><h2>미세먼지 등급 기준</h2><p>미세먼지(PM10)는 30 이하 좋음, 80 이하 보통, 150 이하 나쁨, 그 이상 매우나쁨입니다. 초미세먼지(PM2.5)는 15 이하 좋음, 35 이하 보통, 75 이하 나쁨, 그 이상 매우나쁨입니다(㎍/㎥).</p></div></section>;
}
