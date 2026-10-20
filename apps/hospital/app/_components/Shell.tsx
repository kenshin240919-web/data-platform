import Link from 'next/link';
import {NetworkBar,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="hospital"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🏥</span><span>내근처 병원</span></Link>
      <nav aria-label="주요 메뉴" className="hp-nav"><Link href="/">지금 진료 중</Link><Link href="/er">응급실</Link><Link href="/region">지역별 병원</Link><Link href="/search">병원 찾기</Link><a href="https://pharmacy.guidejung.com" className="hp-nav-out">약국 ↗</a></nav>
      <span className="header-note">지금 진료하는 병원 어디?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🏥 내근처 병원</Link><p>지금 진료 중인 병원·야간·주말·응급실</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href="https://pharmacy.guidejung.com">내근처 약국</a><a href={WEATHER_URL}>내근처 날씨</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · 출처: 국립중앙의료원 전국 병·의원 찾기·응급의료기관 정보(공공데이터포털). 진료 시간은 병원이 신고한 정보로 실제와 다를 수 있어요. 가기 전에 전화로 확인하세요. 응급 상황에는 119에 전화하세요.</p>
    </footer>
  </>;
}
