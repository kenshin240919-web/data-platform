import Link from 'next/link';
import {Contact,NetworkBar,TRIP_URL,WEATHER_URL} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="rest"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">♨️</span><span>내근처 휴식</span></Link>
      <nav aria-label="주요 메뉴" className="rs-nav"><Link href="/">내 주변</Link><Link href="/private">1인 목욕·세신</Link><Link href="/guide">이용 안내</Link><Link href="/region">지역별</Link><Link href="/search">찾기</Link></nav>
      <span className="header-note">오늘 어디서 쉬지?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">♨️ 내근처 휴식</Link><p>내 주변 찜질방·사우나·1인 목욕탕·안마원·피부관리실</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link><a href="https://parking.guidejung.com">내근처 주차장</a><a href={TRIP_URL}>내근처 여행</a><a href={WEATHER_URL}>내근처 날씨</a></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 출처: 행정안전부 지방행정 인허가데이터(목욕장업·의료유사업·미용업). 지자체 신고 정보로 실제와 다를 수 있어요. 가격·영업 시간은 업소에 확인하세요. 출장 마사지는 다루지 않아요.</p>
    </footer>
  </>;
}
