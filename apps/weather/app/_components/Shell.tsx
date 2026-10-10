import Link from 'next/link';
import {TRIP} from '../../lib/regions';

export function Shell({children}:{children:React.ReactNode}){
  return <>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🌤️</span><span>날씨정보</span></Link>
      <nav aria-label="주요 메뉴"><Link href="/">오늘 날씨</Link><Link href="/region">지역별 날씨</Link><Link href="/region/11">서울</Link><Link href="/region/50">제주</Link><a href={TRIP}>여행정보</a></nav>
      <span className="header-note">기상청 공식 예보</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🌤️ 날씨정보</Link><p>전국 시군구 날씨·미세먼지·주간 예보</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href={TRIP}>여행정보</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · 출처: 기상청, 한국환경공단 에어코리아. 예보는 발표 이후 바뀔 수 있습니다.</p>
    </footer>
  </>;
}
