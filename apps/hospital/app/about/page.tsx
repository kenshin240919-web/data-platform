import type {Metadata} from 'next';
import {n,status} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 병원은 내 주변 지금 진료 중인 병원과 야간·주말 진료 병원, 응급실 실시간 병상을 보여 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 병원 소개</h1>
  <p>내근처 병원은 “지금 진료하는 병원 어디?”에 바로 답하는 서비스입니다. 전국 병·의원 {n(status.count)}곳의 요일별 진료 시간과 진료과목으로 지금 진료 중인 곳을 가까운 순으로 보여 드립니다.</p>
  <ul><li>내 주변 지금 진료 중인 소아청소년과·내과·이비인후과 등</li><li>지역별 야간·일요일·공휴일 진료 병원</li><li>가까운 응급실과 실시간 남은 병상</li></ul>
  <p>의료 상담이나 진단을 하지 않습니다. 위급한 상황에는 119에 전화하세요. 내근처 약국·여행·날씨·학원·내 학교와 함께 GuideJung이 운영합니다.</p></div>;}
