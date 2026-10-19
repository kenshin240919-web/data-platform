import type {Metadata} from 'next';
import {Connect,GENERIC,TRIP_URL} from '@guidejung/ui/network';
import {AdSlot} from '@guidejung/ui/ads';
import stations from '../../data/air-stations.json';
import {AirBoard} from '../_components/AirBoard';
import {Faq} from '@guidejung/ui/seo';
import {label,regions,SITE} from '../../lib/regions';

export const metadata:Metadata={title:'오늘 미세먼지 - 전국 실시간 순위',description:'전국 미세먼지·초미세먼지 실시간 측정값. 지금 공기 가장 깨끗한 곳과 나쁜 곳 TOP 10, 시도별 평균을 확인하세요.',alternates:{canonical:SITE+'/air'}};
export default function AirPage(){
  // 측정소마다 가장 가까운 시군구를 미리 정해 두고, 순위 항목을 그 지역 날씨 페이지로 연결한다.
  const places:Record<string,{code:string;label:string}>={};
  for(const s of stations as {name:string;lat:number;lon:number}[]){
    const r=regions.reduce((a,b)=>((b.lat-s.lat)**2+(b.lon-s.lon)**2)<((a.lat-s.lat)**2+(a.lon-s.lon)**2)?b:a);
    places[s.name]={code:r.code,label:label(r)};
  }
  return <section className="section"><div className="eyebrow">AIR QUALITY</div><h1>오늘 전국 미세먼지</h1><AirBoard places={places}/><Connect title="미세먼지 나쁜 날엔" items={[{icon:'🏛️',title:'실내 가볼만한곳',desc:'박물관·전시관 등 실내 여행지',href:`${TRIP_URL}/indoor`},GENERIC.trip,GENERIC.traffic]}/><AdSlot/>
    <div className="prose"><h2>미세먼지 등급 기준</h2><p>미세먼지(PM10)는 30 이하 좋음, 80 이하 보통, 150 이하 나쁨, 그 이상 매우나쁨입니다. 초미세먼지(PM2.5)는 15 이하 좋음, 35 이하 보통, 75 이하 나쁨, 그 이상 매우나쁨입니다(㎍/㎥).</p></div><Faq title="미세먼지 자주 묻는 질문" items={[
      ['미세먼지 좋음·나쁨 기준은 무엇인가요?','미세먼지(PM10)는 ㎥당 30㎍ 이하 좋음, 31~80 보통, 81~150 나쁨, 151 이상 매우나쁨입니다.'],
      ['초미세먼지 기준은 무엇인가요?','초미세먼지(PM2.5)는 ㎥당 15㎍ 이하 좋음, 16~35 보통, 36~75 나쁨, 76 이상 매우나쁨입니다.'],
      ['미세먼지 측정값은 어디서 오나요?',`한국환경공단 에어코리아의 전국 측정소 ${(stations as unknown[]).length.toLocaleString()}곳 실시간 측정값이며, 보통 1시간마다 갱신됩니다.`],
      ['미세먼지 나쁜 날에는 어디로 가면 좋나요?','박물관·전시관·실내 체험시설처럼 실내에서 즐길 수 있는 곳이 좋습니다. 내근처 여행의 실내 여행지 목록에서 가까운 곳을 찾아보세요.']]}/></section>;
}
