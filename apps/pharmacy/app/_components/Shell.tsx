import Link from 'next/link';
import {NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="pharmacy"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">💊</span><span>내근처 약국</span></Link>
      <nav aria-label="주요 메뉴" className="ph-nav"><Link href="/">지금 문 연 약국</Link><Link href="/region">지역별 약국</Link><Link href="/search">약국 찾기</Link><a href={WEATHER_URL} className="ph-nav-out">날씨 ↗</a></nav>
      <span className="header-note">지금 문 연 약국 어디?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">💊 내근처 약국</Link><p>지금 문 연 약국·심야·일요일·공휴일 약국</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href={TRIP_URL}>내근처 여행</a><a href={WEATHER_URL}>내근처 날씨</a><a href="https://school.guidejung.com">내 학교</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · 출처: 국립중앙의료원 전국 약국 정보 조회 서비스. 운영 시간은 약국이 신고한 정보로 실제와 다를 수 있어요. 가기 전에 전화로 확인하세요.</p>
    </footer>
  </>;
}
