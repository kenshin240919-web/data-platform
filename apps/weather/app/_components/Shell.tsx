import Link from 'next/link';
import {TRIP} from '../../lib/regions';
import {WarningBar} from './Warnings';
import {NetworkBar,CHARGE_URL,TRAFFIC_URL} from '@guidejung/ui/network';

export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="weather"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🌤️</span><span>내근처 날씨</span></Link>
      <nav aria-label="주요 메뉴" className="wx-nav"><Link href="/">오늘 날씨</Link><Link href="/weekend">주말 날씨</Link><Link href="/air">미세먼지</Link><Link href="/wear">옷차림</Link><Link href="/region">전국 날씨</Link><a href={TRIP} className="wx-nav-out">여행 ↗</a><a href={TRAFFIC_URL} className="wx-nav-out">교통 ↗</a><a href={CHARGE_URL} className="wx-nav-out">충전소 ↗</a></nav>
      <span className="header-note">오늘 날씨 어때?</span>
    </div></header>
    <WarningBar/>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🌤️ 내근처 날씨</Link><p>전국 시군구 날씨·미세먼지·주간 예보</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href={TRIP}>내근처 여행</a><a href={TRAFFIC_URL}>내근처 고속도로</a><a href={CHARGE_URL}>내근처 충전소</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · 출처: 기상청, 한국환경공단 에어코리아. 예보는 발표 이후 바뀔 수 있습니다.</p>
    </footer>
  </>;
}
