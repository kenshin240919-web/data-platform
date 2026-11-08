import type {Metadata} from 'next';
import {ADS} from '../../lib/fmt';
export const metadata:Metadata={title:'개인정보 안내',description:'내근처 편의점의 위치 정보·광고·방문 분석 도구 사용 안내입니다.',alternates:{canonical:'/privacy'}};
export default function Privacy(){return <div className="page prose"><h1>개인정보 안내</h1>
  <h2>위치 정보</h2><p>‘내 위치 주변 보기’를 누르면 브라우저가 위치 권한을 묻습니다. 위치는 이 브라우저 안에서만 쓰고(30분 보관) 저장하지 않습니다. 가까운 목록과 지금 문 연 약국(내근처 약국, pharmacy.guidejung.com)을 받을 때는 약 2km 칸의 중심 좌표만 요청에 들어가고, 기록하지 않습니다. ‘붕어빵 파는 편의점’은 GS25 앱의 매장 정보를 공개 중계 서비스(mcp.aka.page)에서 받아 오는데, 이때도 약 2km 칸 중심 근처 좌표만 보내고 저장하지 않습니다. 거리 계산과 가까운 순 정렬은 브라우저 안에서 정확한 위치로 합니다. 권한을 허용하지 않으면 접속 지역(IP 기준 대략적인 도시)으로 보여 드립니다.</p><p>내근처 사이트끼리(*.guidejung.com) 옮겨 다닐 때 다시 묻지 않도록, 정확한 위치는 이 휴대폰 안의 내근처 공용 저장소(near.guidejung.com)에만 30분 보관하고 서버로 보내지 않으며, 공용 쿠키(gj_pos)에는 약 2km 칸의 중심 좌표만 30분 보관합니다. 위치가 틀려 ‘동네 직접 고르기’로 고른 곳은 같은 저장소와 이 브라우저에 30일 보관하며, 고를 때 입력한 검색어는 이 브라우저에서 카카오 지도 검색으로 바로 보내고 저장하지 않습니다. ‘홈 화면에 추가’ 안내를 위해 방문 횟수와 마지막 방문 시각만 공용 쿠키(gj_visits)에 1년 보관합니다. 내근처 알림을 받는 중이면 맨 위 ‘알림 받기’ 버튼을 숨기려고 받는 중이라는 표시(gj_alerts)만 공용 쿠키에 1년 둡니다(지역·주제는 담지 않음).</p>
  <h2>즐겨찾기</h2><p>☆ 즐겨찾기한 매장은 이 브라우저(localStorage)에만 저장되고 서버로 보내지 않습니다.</p>
  {ADS&&<><h2>광고</h2><p>Google AdSense 광고가 표시되며, Google과 협력사는 쿠키를 사용해 관심 기반 광고를 보여 줄 수 있습니다. <a href="https://adssettings.google.com">광고 설정</a>에서 끌 수 있습니다.</p></>}
  <h2>방문 분석</h2><p>서비스 개선을 위해 Google Analytics와 Microsoft Clarity로 방문 통계(페이지 이동, 클릭·스크롤 등)를 수집합니다. 이름·연락처 같은 개인정보는 받지 않습니다.</p></div>;}
