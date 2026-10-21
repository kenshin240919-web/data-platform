import type {Metadata} from 'next';
import {n,status} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 주유소는 내 주변 휘발유·경유 가장 싼 주유소와 지역별 평균 기름값을 보여 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 주유소 소개</h1>
  <p>내근처 주유소는 “기름값 제일 싼 곳 어디?”에 바로 답하는 서비스입니다. 한국석유공사 오피넷 가격으로 시군구마다 휘발유가 가장 싼 주유소 20곳과 시도별 경유 최저가를 모아, 전국 {n(status.stations)}곳 가운데 내 주변에서 싼 곳을 가격·거리로 보여 드립니다.</p>
  <ul><li>내 주변 휘발유·경유 최저가 주유소와 거리</li><li>시군구·시도 평균 기름값과 전국 평균 대비</li><li>최근 전국 평균 가격 추이</li></ul>
  <p>내근처 여행·날씨·고속도로·충전소·학원·약국·병원과 내 학교를 함께 GuideJung이 운영합니다.</p></div>;}
