import type {Metadata} from 'next';
import {n,status} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 학원은 우리 동네 학원·교습소와 교육청 공개 수강료를 지역·과목·학년별로 보여 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 학원 소개</h1>
  <p>내근처 학원은 “우리 동네에 어떤 학원이 있지?”, “학원비는 보통 얼마야?”에 바로 답하는 서비스입니다. 전국 학원·교습소 {n(status.count)}곳의 위치와 교육청에 공개된 과정별 수강료를 지역·과목·학년별로 정리합니다.</p>
  <ul><li>내 주변 학원을 가까운 순으로</li><li>시군구별 학원 수와 과목별 공개 수강료(중앙값·최저·최고)</li><li>학원별 교습과정·수강료·정원·개설일</li></ul>
  <p>내근처 여행·날씨·고속도로·충전소와 함께 GuideJung이 운영합니다. 학원 광고나 순위 대가를 받지 않으며, 목록 순서는 공개 정보가 많은 곳을 먼저 보여 줍니다.</p></div>;}
