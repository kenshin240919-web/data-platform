import Link from 'next/link';
import {NetworkBar,SITES,type Site} from '@guidejung/ui/network';
const ALL=(Object.keys(SITES) as Site[]).filter(k=>k!=='near'&&!SITES[k].hidden);
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="near"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">📍</span><span>내근처</span></Link>
      <nav aria-label="주요 메뉴" className="nr-nav"><Link href="/">내 근처 모아보기</Link><Link href="/situation/sick-kid">아이 아플 때</Link><Link href="/situation/weekend">주말 나들이</Link><Link href="/situation/car-trouble">차 고장</Link></nav>
      <span className="header-note">내 근처에 뭐가 있지?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">📍 내근처</Link><p>여행·날씨·약국·병원·주유소·주차장… 내 주변 정보를 한 곳에서</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link>{ALL.map(k=><a key={k} href={SITES[k].url}>{SITES[k].brand}</a>)}</div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · 각 정보의 출처는 해당 내근처 사이트의 데이터·출처 안내를 따릅니다. 운영 시간·가격은 실제와 다를 수 있어요. 가기 전에 확인하세요.</p>
    </footer>
  </>;
}
