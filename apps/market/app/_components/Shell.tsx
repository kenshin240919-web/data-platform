import Link from 'next/link';
import {Contact,NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="market"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🏪</span><span>내근처 시장</span></Link>
      <nav aria-label="주요 메뉴" className="mk-nav"><Link href="/">내 주변 사용처</Link><Link href="/jang">오늘 장날</Link><Link href="/item">품목별</Link><Link href="/region">지역별</Link><Link href="/guide">온누리 안내</Link><Link href="/search">가게 찾기</Link></nav>
      <span className="header-note">온누리 어디서 써?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🏪 내근처 시장</Link><p>온누리상품권 사용처 — 내 주변 전통시장·상점가 가맹점</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href="https://parking.guidejung.com">내근처 주차장</a><a href={TRIP_URL}>내근처 여행</a><a href={WEATHER_URL}>내근처 날씨</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 출처: 소상공인시장진흥공단 「전국 온누리상품권 가맹점 현황」(공공데이터포털, 이용 제한 없음), 전국전통시장표준데이터. 시장·상점가 위치 일부는 카카오 검색으로 찾았어요. 가맹 여부는 바뀔 수 있으니 결제 전에 가게에 확인하세요. 이 사이트는 소상공인시장진흥공단과 관계없는 민간 정보 서비스예요.</p>
    </footer>
  </>;
}
