import Link from 'next/link';
import {Contact,NetworkBar} from '@guidejung/ui/network';
export function Shell({children}:{children:React.ReactNode}){
  return <>
    <NetworkBar current="stock"/>
    <header className="header"><div className="header-inner">
      <Link href="/" className="brand"><span aria-hidden="true">🧺</span><span>내근처 재고</span></Link>
      <nav aria-label="주요 메뉴" className="sk-nav"><Link href="/">재고 찾기</Link><Link href="/daiso">자주 찾는 물건</Link><Link href="/about">소개</Link></nav>
      <span className="header-note">그거 근처 매장에 있어?</span>
    </div></header>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">🧺 내근처 재고</Link><p>내 동네 매장에 그 물건 있는지</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link></div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 다이소와 관계없는 비공식 안내입니다. 재고는 다이소몰에 공개된 정보를 공개 중계로 받아 보여 드리며 실제 매장과 다를 수 있습니다. 상품명·가격은 다이소몰 정보 기준입니다.</p>
    </footer>
  </>;
}
