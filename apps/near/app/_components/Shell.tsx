import Link from 'next/link';
import {Contact,NetworkBar,SITES,type Site} from '@guidejung/ui/network';
const ALL=(Object.keys(SITES) as Site[]).filter(k=>k!=='near'&&!SITES[k].hidden);
export function Shell({children}:{children:React.ReactNode}){
  return <>
    {/* 로고 줄 없음(11/8 사용자): 맨 위 연결 바의 '📍 내근처'가 같은 곳(첫 화면)으로 감 */}
    <NetworkBar current="near"/>
    <main>{children}</main>
    <footer>
      <div><Link href="/" className="footer-brand">📍 내근처</Link><p>여행·날씨·약국·병원·주유소·주차장… 내 주변 정보를 한 곳에서</p></div>
      <div className="footer-links"><Link href="/about">서비스 소개</Link><Link href="/data-policy">데이터·출처 안내</Link><Link href="/privacy">개인정보 안내</Link>{ALL.map(k=><a key={k} href={SITES[k].url}>{SITES[k].brand}</a>)}</div>
      <p className="muted small">© {new Date().getFullYear()} GuideJung Data · <Contact/> · 각 정보의 출처는 해당 내근처 사이트의 데이터·출처 안내를 따릅니다. 운영 시간·가격은 실제와 다를 수 있어요. 가기 전에 확인하세요.</p>
    </footer>
  </>;
}
