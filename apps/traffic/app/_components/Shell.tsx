import Link from 'next/link';
import {CHARGE,TRIP,WEATHER} from '../../lib/data';
import {IncidentBar} from './IncidentBar';
import {Contact,NetworkBar} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="traffic"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🛣️</span><span>내근처 고속도로</span></Link>
      <nav aria-label="주요 메뉴" className="tf-nav"><Link href="/">실시간 정체</Link><Link href="/road">고속도로별</Link><Link href="/rest">휴게소</Link><Link href="/gas">휴게소 기름값</Link><Link href="/incidents">사고·공사</Link><a href={WEATHER} className="tf-nav-out">날씨 ↗</a><a href={CHARGE} className="tf-nav-out">충전소 ↗</a><a href={TRIP} className="tf-nav-out">여행 ↗</a></nav>
      <span className="header-note">지금 길 막혀?</span>
    </div></header>
    <IncidentBar/>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🛣️ 내근처 고속도로</Link><p>전국 고속도로 실시간 정체·휴게소·기름값</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href={WEATHER}>내근처 날씨</a><a href={CHARGE}>내근처 충전소</a><a href={TRIP}>내근처 여행</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 출처: 한국도로공사 고속도로 공공데이터 포털. 소통 정보는 약 5분 간격으로 갱신되며 실제와 다를 수 있습니다.</p>
    </footer>
  </>;
}
