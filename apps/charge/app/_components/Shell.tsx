import Link from 'next/link';
import {NetworkBar,TRAFFIC_URL} from '@guidejung/ui/network';
import {TRIP,WEATHER} from '../../lib/regions';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="charge"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">⚡</span><span>충전소정보</span></Link>
      <nav aria-label="주요 메뉴" className="ev-nav"><Link href="/">내 주변 충전소</Link><Link href="/region">지역별 충전소</Link><a href={WEATHER} className="ev-nav-out">날씨 ↗</a><a href={TRIP} className="ev-nav-out">여행 ↗</a><a href={TRAFFIC_URL} className="ev-nav-out">교통 ↗</a></nav>
      <span className="header-note">실시간 충전기 상태</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">⚡ 충전소정보</Link><p>전국 전기차 충전소 위치와 실시간 이용 가능 여부</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href={TRIP}>여행정보</a><a href={WEATHER}>날씨정보</a><a href={TRAFFIC_URL}>교통정보</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · 출처: 한국환경공단 전기자동차 충전소 정보(공공데이터포털). 상태는 운영기관 전송 시각 기준이며 실제와 다를 수 있습니다.</p>
    </footer>
  </>;
}
