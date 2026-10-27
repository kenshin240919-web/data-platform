import Link from 'next/link';
import {Contact,NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="civil"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🖨️</span><span>내근처 서류</span></Link>
      <nav aria-label="주요 메뉴" className="cv-nav"><Link href="/">내 주변</Link><Link href="/doc">서류별</Link><Link href="/print">무인 프린트</Link><Link href="/weekend">주말 발급기</Link><Link href="/region">지역별</Link><Link href="/search">찾기</Link></nav>
      <span className="header-note">떼고, 뽑고, 부치는 곳</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🖨️ 내근처 서류</Link><p>내 주변 무인민원발급기·주민센터·구청 민원실·여권 발급·우체국·무인 프린트</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href="https://parking.guidejung.com">내근처 주차장</a><a href={TRIP_URL}>내근처 여행</a><a href={WEATHER_URL}>내근처 날씨</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 공공데이터로 만든 민간 안내 사이트예요(정부·지자체 공식 사이트가 아님). 출처: 행정안전부·한국지역정보개발원·우정사업본부·외교부. 운영 시간은 바뀔 수 있으니 방문 전 확인하세요.</p>
    </footer>
  </>;
}
