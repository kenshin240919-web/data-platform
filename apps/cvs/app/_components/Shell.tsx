import Link from 'next/link';
import {Contact,NetworkBar} from '@guidejung/ui/network';
import {PHARMACY,HOSPITAL} from '../../lib/fmt';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="cvs"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🌙</span><span>내근처 편의점</span></Link>
      <nav aria-label="주요 메뉴" className="cv-nav"><Link href="/">내 주변</Link><Link href="/medicine">상비약 안내</Link><Link href="/region">지역별</Link><Link href="/search">찾기</Link></nav>
      <span className="header-note">밤에도 상비약 어디서?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🌙 내근처 편의점</Link><p>약국이 닫은 밤에도 상비약 살 수 있는 편의점</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href={PHARMACY}>내근처 약국</a><a href={HOSPITAL}>내근처 병원</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 출처: 행정안전부 지방행정 인허가데이터(안전상비의약품 판매업소). 편의점 본사·가맹점과 관계없는 비공식 안내입니다. 실제 영업 시간과 판매 품목은 매장에 확인하세요.</p>
    </footer>
  </>;
}
