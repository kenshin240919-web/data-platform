import Link from 'next/link';
import {Contact,NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="pet"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🐾</span><span>내근처 동물병원</span></Link>
      <nav aria-label="주요 메뉴" className="pt-nav"><Link href="/">내 주변</Link><Link href="/24h">24시 동물병원</Link><Link href="/pharmacy">동물약국</Link><Link href="/guide">아플 때</Link><Link href="/region">지역별</Link><Link href="/search">찾기</Link></nav>
      <span className="header-note">우리 아이 아플 때 어디로?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🐾 내근처 동물병원</Link><p>내 주변 동물병원·24시 동물병원·동물약국·펫호텔·애견 카페·펫택시</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href="https://pharmacy.guidejung.com">내근처 약국</a><a href={`${TRIP_URL}/pet`}>반려동물 동반 여행</a><a href={WEATHER_URL}>내근처 날씨</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 출처: 행정안전부 지방행정 인허가데이터(동물병원·동물약국·동물위탁관리업·동물전시업·동물운송업), 국립중앙의료원 약국 영업 시간. 지자체 신고 정보로 실제와 다를 수 있어요. 진료 시간은 병원에 확인하세요. 응급 상황이면 가까운 24시 동물병원에 먼저 전화하세요.</p>
    </footer>
  </>;
}
