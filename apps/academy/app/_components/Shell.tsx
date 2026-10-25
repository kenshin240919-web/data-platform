import Link from 'next/link';
import {Contact,NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
import {CompareBar} from './CompareBar';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="academy"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🎓</span><span>내근처 학원</span></Link>
      <nav aria-label="주요 메뉴" className="ac-nav"><Link href="/region">지역별 학원</Link><Link href="/search">학원 찾기</Link><Link href="/rank">학원비 순위</Link><Link href="/compare">학원 비교</Link><a href={TRIP_URL+'/kids'} className="ac-nav-out">아이와 갈 곳 ↗</a><a href={WEATHER_URL} className="ac-nav-out">날씨 ↗</a></nav>
      <span className="header-note">우리 동네 학원비 얼마야?</span>
    </div></header>
    <main>{children}</main>
    <CompareBar/>
    <footer>
      <div><Link href="/" className="footer-brand">🎓 내근처 학원</Link><p>우리 동네 학원·교습소와 교육청 공개 수강료</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href={TRIP_URL}>내근처 여행</a><a href={WEATHER_URL}>내근처 날씨</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 출처: 나이스(NEIS) 교육정보 개방 포털 학원교습소정보. 수강료는 교육청에 공개된 금액이며 실제와 다를 수 있으니 학원에 꼭 확인하세요.</p>
    </footer>
  </>;
}
