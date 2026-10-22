import type {Metadata} from 'next';
import {n,status} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 주차장은 내 주변 공영·무료 주차장과 주차 시간별 예상 요금을 보여 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 주차장 소개</h1>
  <p>내근처 주차장은 “여기 주차 어디 해?”에 바로 답하는 서비스입니다. 지자체가 등록한 전국 주차장 {n(status.count)}곳(대부분 공영 주차장)의 위치·요금·운영 시간으로 가까운 곳과 싼 곳을 보여 드립니다.</p>
  <ul><li>내 주변 공영·무료 주차장과 거리</li><li>주차 시간(30분·1시간·2시간·4시간)별 예상 요금, 싼 순 정렬</li><li>지역별 무료·24시간 주차장</li><li>주차장별 요금표·운영 시간·주차면 수·길찾기</li></ul>
  <p>민간 건물·상가 주차장은 대부분 원본 데이터에 없어 보여 드리지 못합니다. 내근처 여행·날씨·고속도로·충전소·학원·약국·병원·주유소와 내 학교를 함께 GuideJung이 운영합니다.</p></div>;}
