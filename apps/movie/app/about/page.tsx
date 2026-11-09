import type {Metadata} from 'next';
import {n,status} from '../../lib/data';
export const metadata:Metadata={title:'서비스 소개',description:'내근처 영화관은 내 주변 극장을 가까운 순으로 찾아 오늘 곧 시작하는 영화와 남은 좌석을 보여 주는 서비스입니다.',alternates:{canonical:'/about'}};
export default function About(){return <div className="page prose"><h1>내근처 영화관 소개</h1>
  <p>내근처 영화관은 “지금 근처에서 뭐 볼 수 있지?”에 바로 답하는 서비스입니다. 지자체에 등록된 영화상영관을 극장 {n(status.count)}곳(상영관 {n(status.screens)}개)으로 묶어 가까운 순으로 보여 드리고, CGV·롯데시네마·메가박스는 오늘 남은 상영 시간과 남은 좌석을 함께 알려 드립니다.</p>
  <ul><li>극장 목록은 공공데이터(행정안전부 지방행정 인허가데이터) 원문으로 만듭니다.</li><li>상영 시간·남은 좌석은 극장 앱 정보를 공개 중계로 받은 비공식 안내이고, 예매는 하지 않습니다.</li><li>박스오피스는 영화진흥위원회 통합전산망 오픈 API를 방문 때마다 바로 확인해 보여 드리고 저장하지 않습니다.</li><li>극장 본사와 관계없는 비공식 안내입니다.</li></ul>
  <p>내근처 주차장·여행·날씨 등 내근처 시리즈를 GuideJung이 함께 운영합니다.</p></div>;}
