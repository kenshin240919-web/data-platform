import type {Metadata} from 'next';
import Link from 'next/link';
import {AREAS} from '@guidejung/ui/network';
import {AlertSetup} from '../_components/AlertSetup';

// 알림 설정은 도구 페이지라 검색에 내보내지 않음(사이트맵에도 없음).
export const metadata:Metadata={title:'알림 받기 · 우리 동네 아침 날씨·문 연 약국·새 혜택',description:'매일 아침 우리 동네 날씨(어제와 비교), 일요일·공휴일 문 연 약국, 새 지원금·혜택과 마감 3일 전 소식을 휴대폰 알림으로 받아 보세요.',alternates:{canonical:'/alerts'},robots:{index:false,follow:true}};
export default function Alerts(){
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 알림 받기</nav>
    <AlertSetup areas={AREAS}/>
    <section className="prose"><h2>어떤 알림이 오나요?</h2><ul>
      <li><b>🌤️ 매일 아침 7시</b> — “경기 과천시 아침 날씨 · 🍂 어제보다 3° 낮아요 · 쌀쌀해요 / 오늘 6~14° · 비 0% · 미세먼지 보통”</li>
      <li><b>💊 일요일·공휴일 아침 8시 30분</b> — “오늘(일요일) 우리 동네 문 연 약국 12곳 · 가까운 곳: ○○약국”</li>
      <li><b>🎁 새 혜택·마감 3일 전(있는 날만, 아침 8시 30분)</b> — “서울 강남구 새 혜택 1가지 · 새 혜택: ○○ 지원금” · 월요일엔 “이번 주 우리 동네 혜택 소식 · 이번 달 안 마감 N건”</li></ul>
      <p>알림을 누르면 내근처 날씨·약국·혜택 페이지가 바로 열려요. 고른 지역(시군구)만 저장하고, 내 정확한 위치는 저장하지 않아요.</p></section>
  </div>;
}
