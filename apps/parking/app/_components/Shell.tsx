import Link from 'next/link';
import {NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="parking"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🅿️</span><span>내근처 주차장</span></Link>
      <nav aria-label="주요 메뉴" className="pk-nav"><Link href="/">내 주변 주차장</Link><Link href="/region">지역별 주차장</Link><Link href="/search">주차장 찾기</Link><a href={TRIP_URL} className="pk-nav-out">여행 ↗</a></nav>
      <span className="header-note">여기 주차 어디 해?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🅿️ 내근처 주차장</Link><p>내 주변 공영·무료 주차장과 예상 요금</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href={TRIP_URL}>내근처 여행</a><a href={WEATHER_URL}>내근처 날씨</a><a href="https://charge.guidejung.com">내근처 충전소</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · 출처: 전국주차장정보표준데이터(공공데이터포털, 각 지자체). 요금·운영 시간은 지자체가 등록한 정보로 현장과 다를 수 있어요.</p>
    </footer>
  </>;
}
