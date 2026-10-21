import Link from 'next/link';
import {NetworkBar,CHARGE_URL,TRAFFIC_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="oil"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">⛽</span><span>내근처 주유소</span></Link>
      <nav aria-label="주요 메뉴" className="oi-nav"><Link href="/">내 주변 최저가</Link><Link href="/region">지역별 휘발유</Link><Link href="/diesel">경유 최저가</Link><a href={TRAFFIC_URL+'/gas'} className="oi-nav-out">휴게소 기름값 ↗</a></nav>
      <span className="header-note">기름값 제일 싼 곳 어디?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">⛽ 내근처 주유소</Link><p>오늘 휘발유·경유 최저가 주유소</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href={TRAFFIC_URL}>내근처 고속도로</a><a href={CHARGE_URL}>내근처 충전소</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · 출처: 한국석유공사 오피넷. 가격은 하루 한 번 받은 값으로 실제 판매 가격과 다를 수 있어요.</p>
    </footer>
  </>;
}
