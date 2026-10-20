import type {Metadata} from 'next';
import {n,status} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 약국은 내 주변 지금 문 연 약국과 심야·일요일·공휴일 약국을 보여 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 약국 소개</h1>
  <p>내근처 약국은 “지금 문 연 약국 어디?”에 바로 답하는 서비스입니다. 전국 약국 {n(status.count)}곳의 요일별 운영 시간으로 지금 영업 중인 곳을 가까운 순으로 보여 드립니다.</p>
  <ul><li>내 주변 지금 영업 중인 약국과 닫는 시간</li><li>지역별 심야(밤 10시 이후)·일요일·공휴일 약국</li><li>약국별 요일별 운영 시간·전화·길찾기</li></ul>
  <p>내근처 여행·날씨·고속도로·충전소·학원과 내 학교를 함께 GuideJung이 운영합니다.</p></div>;}
