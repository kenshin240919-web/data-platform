import Link from 'next/link';
import {Contact,NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="service"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🔧</span><span>내근처 서비스센터</span></Link>
      <nav aria-label="주요 메뉴" className="sv-nav"><Link href="/">지금 여는 정비소</Link><Link href="/inspection">자동차 검사</Link><Link href="/guide">맡기기 전 확인</Link><Link href="/brand">가전·휴대폰</Link><Link href="/region">지역별</Link><Link href="/search">찾기</Link></nav>
      <span className="header-note">고장 났다, 어디로 가지?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🔧 내근처 서비스센터</Link><p>내 주변 자동차 정비소·검사소·세차장</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href="https://parking.guidejung.com">내근처 주차장</a><a href="https://oil.guidejung.com">내근처 주유소</a><a href={TRIP_URL}>내근처 여행</a><a href={WEATHER_URL}>내근처 날씨</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 출처: 공공데이터포털 전국자동차정비업체·자동차검사소 표준데이터, 지방행정 인허가데이터(세차장·배출가스 정비). 지자체 등록 정보로 실제와 다를 수 있어요. 가기 전에 전화로 확인하세요.</p>
    </footer>
  </>;
}
