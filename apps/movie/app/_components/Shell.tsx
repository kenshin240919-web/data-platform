import Link from 'next/link';
import {Contact,NetworkBar} from '@guidejung/ui/network';
import {PARKING,TRIP} from '../../lib/fmt';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="movie"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🎬</span><span>내근처 영화관</span></Link>
      <nav aria-label="주요 메뉴" className="mv-nav"><Link href="/">내 주변</Link><Link href="/boxoffice">박스오피스</Link><Link href="/region">지역별</Link><Link href="/drive">자동차극장</Link><Link href="/search">찾기</Link></nav>
      <span className="header-note">지금 뭐 볼 수 있어?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🎬 내근처 영화관</Link><p>내 주변 극장과 오늘 남은 상영</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href={PARKING}>내근처 주차장</a><a href={TRIP}>내근처 여행</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 출처: 행정안전부 지방행정 인허가데이터(영화상영관). 박스오피스: 영화진흥위원회 통합전산망 오픈 API. 상영 시간·남은 좌석은 각 극장 앱 정보를 공개 중계로 받은 비공식 안내이며, 극장 본사와 관계없습니다. 예매는 각 극장 공식 앱·누리집에서 하세요.</p>
    </footer>
  </>;
}
