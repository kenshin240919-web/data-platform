import type {Metadata} from 'next';
import {baseLabel,n,nation,status} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 시장은 온누리상품권을 쓸 수 있는 가맹점을 내 주변부터, 시장·지역·품목별로 찾아 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 시장 소개</h1>
  <p>내근처 시장은 “온누리상품권 어디서 써?”에 바로 답하는 서비스입니다. 소상공인시장진흥공단이 공개한 온누리상품권 가맹점 {n(nation.n)}곳(전통시장·상점가 {n(nation.markets)}곳, {baseLabel(status.base)} 기준)을 내 주변부터, 시장·시군구·품목별로 보여 드립니다.</p>
  <ul><li>공식 가맹점 목록 원문(가게 이름·소속 시장·품목·지류/디지털 가맹 여부·가맹 연도)만 보여 드리고, 가격·후기는 지어내지 않습니다.</li><li>가게 위치는 소속 시장·상점가 기준이고, 가게 상세에서 지도로 한 번 더 찾아 드립니다.</li><li>이 사이트는 소상공인시장진흥공단과 관계없는 민간 정보 서비스입니다. 상품권 구매·환불은 발행처 공식 안내를 따르세요.</li></ul>
  <p>내근처 여행·날씨·고속도로·충전소·학원·약국·병원·주유소·주차장·서비스센터·휴식·동물병원·서류와 내 학교를 함께 GuideJung이 운영합니다.</p></div>;}
