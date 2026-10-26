import type {Metadata} from 'next';
import {n,nation} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 동물병원은 내 주변 동물병원·24시 동물병원·지금 문 연 동물약국·펫호텔·애견 카페·펫택시를 신고된 곳만 가까운 순으로 찾아 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 동물병원 소개</h1>
  <p>내근처 동물병원은 “우리 아이 아플 때 어디로?”에 바로 답하는 서비스입니다. 지자체에 영업 신고된 동물병원 {n(nation.kinds.hospital)}곳(이름에 ‘24’가 든 곳 {n(nation.h24)}곳), 동물약국 {n(nation.kinds.pharmacy)}곳, 펫호텔·유치원 {n(nation.kinds.hotel)}곳, 애견·고양이 카페 {n(nation.kinds.cafe)}곳, 펫택시 {n(nation.kinds.taxi)}곳을 가까운 순으로 보여 드립니다.</p>
  <ul><li>공공데이터 원문(이름·주소·전화·개설일)만 보여 드리고, 진료 시간·가격·후기는 지어내지 않습니다.</li><li>동물약국은 약국 영업 시간(국립중앙의료원)을 붙여 지금 문 열었는지 보여 드립니다({n(nation.withHours)}곳).</li><li>진료 시간은 병원별 네이버 지도 검색 링크와 전화 버튼으로 확인할 수 있습니다.</li></ul>
  <p>내근처 여행·날씨·고속도로·충전소·학원·약국·병원·주유소·주차장·서비스센터·휴식과 내 학교를 함께 GuideJung이 운영합니다.</p></div>;}
