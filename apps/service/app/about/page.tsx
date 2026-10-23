import type {Metadata} from 'next';
import {n,nation} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 서비스센터는 내 주변 자동차 정비소·검사소·세차장을 찾고 정비 맡기기 전 확인할 것을 알려 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 서비스센터 소개</h1>
  <p>내근처 서비스센터는 “고장 났다, 어디로 가지?”에 바로 답하는 서비스입니다. 지자체가 등록한 자동차 정비소 {n(nation.kinds.repair)}곳, 검사소 {n(nation.kinds.inspect)}곳, 세차장 {n(nation.kinds.wash)}곳, 배출가스 정비 {n(nation.kinds.emission)}곳을 가까운 순으로 보여 드립니다.</p>
  <ul><li>내 주변 정비소(종합·소형·전문 정비)·검사소·세차장</li><li>자동차 검사 기한·과태료 계산기</li><li>정비 맡기기 전 체크리스트와 정비소 종류 설명</li></ul>
  <p>가전·휴대폰 서비스센터는 공공 데이터가 없어 아직 보여 드리지 못합니다. 각 제조사 누리집의 ‘서비스센터 찾기’를 이용하세요. 내근처 여행·날씨·고속도로·충전소·학원·약국·병원·주유소·주차장과 내 학교를 함께 GuideJung이 운영합니다.</p></div>;}
