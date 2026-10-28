import Link from 'next/link';
import {Contact,NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="benefit"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🎁</span><span>내근처 혜택</span></Link>
      <nav aria-label="주요 메뉴" className="bf-nav"><Link href="/">우리 동네 혜택</Link><Link href="/find">나에게 맞는 혜택</Link><Link href="/deadline">마감 임박</Link><Link href="/new">새 혜택</Link><Link href="/topic">분야별</Link><Link href="/region">지역별</Link><Link href="/search">검색</Link></nav>
      <span className="header-note">우리 동네 지원금, 놓친 거 없어?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🎁 내근처 혜택</Link><p>우리 동네 지원금·혜택 — 시군구·시도·국가 혜택을 한곳에</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href="https://minwon.guidejung.com">내근처 서류</a><a href={TRIP_URL}>내근처 여행</a><a href={WEATHER_URL}>내근처 날씨</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 출처: 행정안전부 「대한민국 공공서비스(혜택) 정보」(공공데이터포털, 이용 제한 없음). 이 사이트는 정부·지자체와 관계없는 민간 정보 서비스예요. 신청은 정부24나 담당 기관에서 하시고, 금액·대상·기한은 신청 전에 꼭 확인하세요.</p>
    </footer>
  </>;
}
