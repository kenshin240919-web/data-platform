import type {Metadata} from 'next';
import {n,nation} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 휴식은 내 주변 찜질방·사우나·목욕탕, 1인 목욕·세신샵, 안마원, 피부관리실을 신고된 곳만 가까운 순으로 찾아 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 휴식 소개</h1>
  <p>내근처 휴식은 “오늘 어디서 쉬지?”에 바로 답하는 서비스입니다. 지자체에 영업 신고된 찜질방·사우나·목욕탕 {n(nation.kinds.sauna)}곳, 1인·프라이빗 목욕·세신샵 {n(nation.kinds.private)}곳, 안마원·안마시술소 {n(nation.kinds.anma)}곳, 피부관리실 {n(nation.kinds.skin)}곳을 가까운 순으로 보여 드립니다.</p>
  <ul><li>공공데이터 원문(이름·주소·전화·신고일)만 보여 드리고, 사진·후기·가격은 지어내지 않습니다.</li><li>가격·예약·영업 시간은 업소별 네이버 지도 검색 링크와 전화 버튼으로 확인할 수 있습니다.</li><li>이름에 선정적인 표현이 들어간 곳과 출장 마사지는 다루지 않습니다.</li></ul>
  <p>내근처 여행·날씨·고속도로·충전소·학원·약국·병원·주유소·주차장·서비스센터와 내 학교를 함께 GuideJung이 운영합니다.</p></div>;}
