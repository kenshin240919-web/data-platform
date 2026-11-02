import Link from 'next/link';
import {Contact,NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="job"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">💼</span><span>내근처 일자리</span></Link>
      <nav aria-label="주요 메뉴" className="jb-nav"><Link href="/">내 주변</Link><Link href="/center">고용센터</Link><Link href="/agency">직업소개소</Link><Link href="/women">새일센터</Link><Link href="/senior">노인일자리</Link><Link href="/guide">상황별 안내</Link><Link href="/region">지역별</Link><Link href="/search">찾기</Link></nav>
      <span className="header-note">일자리 찾을 때 가는 곳</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">💼 내근처 일자리</Link><p>내 주변 고용센터(관할)·직업소개소·여성새로일하기센터·노인일자리 기관·대학일자리플러스센터</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href="https://benefit.guidejung.com">내근처 혜택</a><a href="https://minwon.guidejung.com">내근처 서류</a><a href={TRIP_URL}>내근처 여행</a><a href={WEATHER_URL}>내근처 날씨</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 공공데이터로 만든 민간 안내 사이트예요(정부·지자체 공식 사이트가 아니고, 일자리를 소개하거나 채용 공고를 싣지 않아요). 출처: 고용노동부·행정안전부·성평등가족부·한국노인인력개발원. 방문 전 기관에 확인하세요.</p>
    </footer>
  </>;
}
