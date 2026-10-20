import Link from 'next/link';
import {NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="school"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🏫</span><span>내 학교</span></Link>
      <nav aria-label="주요 메뉴" className="sc-nav"><Link href="/">오늘 급식</Link><Link href="/search">학교 찾기</Link><Link href="/region">지역별 학교</Link><a href="https://academy.guidejung.com" className="sc-nav-out">학원 ↗</a><a href={WEATHER_URL} className="sc-nav-out">날씨 ↗</a></nav>
      <span className="header-note">오늘 급식 뭐야?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🏫 내 학교</Link><p>우리 학교 오늘 급식·학사일정·시간표</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href="https://academy.guidejung.com">내근처 학원</a><a href={TRIP_URL}>내근처 여행</a><a href={WEATHER_URL}>내근처 날씨</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · 출처: 나이스(NEIS) 교육정보 개방 포털. 학교가 입력한 급식·학사일정·시간표는 바뀔 수 있어요.</p>
    </footer>
  </>;
}
