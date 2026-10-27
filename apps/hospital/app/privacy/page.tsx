import type {Metadata} from 'next';
export const metadata:Metadata={title:'개인정보 안내',description:'내근처 병원의 위치 정보·광고·방문 분석 도구 사용 안내입니다.',alternates:{canonical:'/privacy'}};
export default function Privacy(){return <div className="page prose"><h1>개인정보 안내</h1>
  <h2>위치 정보</h2><p>‘내 위치 주변…’ 카드를 누르면 브라우저가 위치 권한을 묻습니다. 위치는 이 브라우저 안에서만 쓰고(30분 보관) 저장하지 않습니다. 가까운 병원·응급실 목록을 받을 때 좌표가 요청에 들어가지만 기록하지 않습니다. 권한을 허용하지 않으면 접속 지역(IP 기준 대략적인 도시)으로 보여 드립니다.</p><p>내근처 사이트끼리(*.guidejung.com) 옮겨 다닐 때 다시 묻지 않도록, 정확한 위치 대신 내 위치가 속한 약 2km 칸의 중심 좌표만 30분 동안 공용 쿠키(gj_pos)에 보관합니다. 정확한 위치는 이 브라우저 밖으로 보내지 않습니다. 주변 검색 때 서버에는 약 2km 칸의 중심 좌표만 보내고, 거리 계산과 가까운 순 정렬은 브라우저 안에서 정확한 위치로 합니다. 서버는 칸 좌표도 저장하거나 기록하지 않습니다.</p>
  <h2>건강 정보</h2><p>이 사이트는 증상·진료 기록 등 건강 정보를 받지 않습니다. 고른 진료과목은 목록을 보여 주는 데만 쓰고 저장하지 않습니다.</p>
  <h2>광고</h2><p>Google AdSense 광고가 표시되며, Google과 협력사는 쿠키를 사용해 관심 기반 광고를 보여 줄 수 있습니다. <a href="https://adssettings.google.com">광고 설정</a>에서 끌 수 있습니다.</p>
  <h2>방문 분석</h2><p>서비스 개선을 위해 Google Analytics와 Microsoft Clarity로 방문 통계(페이지 이동, 클릭·스크롤 등)를 수집합니다. 이름·연락처 같은 개인정보는 받지 않습니다.</p></div>;}
