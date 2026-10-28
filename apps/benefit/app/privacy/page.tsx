import type {Metadata} from 'next';
export const metadata:Metadata={title:'개인정보 안내',description:'내근처 혜택의 위치 정보·맞춤 찾기 조건·광고·방문 분석 도구 사용 안내입니다.',alternates:{canonical:'/privacy'}};
export default function Privacy(){return <div className="page prose"><h1>개인정보 안내</h1>
  <h2>위치 정보</h2><p>‘우리 동네 혜택 보기’를 누르면 브라우저가 위치 권한을 묻습니다. 위치는 이 브라우저 안에서 가장 가까운 시군구를 고르는 데만 쓰고, 서버에는 시군구 코드만 들어간 목록 주소를 요청합니다. 권한을 허용하지 않으면 접속 지역(IP 기준 대략적인 도시)으로 보여 드립니다.</p><p>내근처 사이트끼리(*.guidejung.com) 옮겨 다닐 때 다시 묻지 않도록, 정확한 위치는 이 휴대폰 안의 내근처 공용 저장소(near.guidejung.com)에만 30분 보관하고 서버로 보내지 않으며, 공용 쿠키(gj_pos)에는 약 2km 칸의 중심 좌표만 30분 보관합니다. ‘홈 화면에 추가’ 안내를 위해 방문 횟수와 마지막 방문 시각만 공용 쿠키(gj_visits)에 1년 보관합니다. 내근처 알림을 받는 중이면 맨 위 ‘알림 받기’ 버튼을 숨기려고 받는 중이라는 표시(gj_alerts)만 공용 쿠키에 1년 둡니다.</p>
  <h2>맞춤 찾기 조건</h2><p>‘나에게 맞는 혜택 찾기’에서 고른 사는 곳·나이·상황·소득은 이 브라우저 안(localStorage)에만 저장하고 서버로 보내지 않습니다. 혜택 목록을 받아 휴대폰 안에서 맞춥니다.</p>
  <h2>광고</h2><p>Google AdSense 광고가 표시되며, Google과 협력사는 쿠키를 사용해 관심 기반 광고를 보여 줄 수 있습니다. <a href="https://adssettings.google.com">광고 설정</a>에서 끌 수 있습니다.</p>
  <h2>방문 분석</h2><p>서비스 개선을 위해 Google Analytics와 Microsoft Clarity로 방문 통계(페이지 이동, 클릭·스크롤 등)를 수집합니다. 이름·연락처 같은 개인정보는 받지 않습니다.</p></div>;}
