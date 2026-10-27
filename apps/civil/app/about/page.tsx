import type {Metadata} from 'next';
import {n,nation} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 서류는 내 주변 무인민원발급기·주민센터·구청 민원실·여권 발급 기관·우체국·무인 프린트를 가까운 순으로 찾아 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 서류 소개</h1>
  <p>내근처 서류는 “서류 어디서 떼지?”에 바로 답하는 서비스입니다. 무인민원발급기 {n(nation.kinds.kiosk)}대의 운영 시간과 뗄 수 있는 서류, 주민센터 {n(nation.kinds.office)}곳, 실시간 대기를 알려 주는 시·구청 민원실 {n(nation.kinds.cso)}곳, 여권 발급 기관 {n(nation.kinds.passport)}곳, 우체국 {n(nation.kinds.post)}곳을 가까운 순으로 보여 드립니다.</p>
  <ul><li>공공데이터로 만든 민간 안내 사이트입니다. 정부·지자체의 공식 사이트가 아닙니다.</li><li>무인 프린트점·프린트카페는 카카오맵·네이버 지역 검색 결과를 방문 때마다 실시간으로 보여 드리며 저장하지 않습니다.</li><li>수수료는 서류·지자체마다 달라 적지 않습니다.</li></ul>
  <p>내근처 여행·날씨·고속도로·충전소·학원·약국·병원·주유소·주차장·서비스센터·휴식·동물병원과 내 학교를 함께 GuideJung이 운영합니다.</p></div>;}
