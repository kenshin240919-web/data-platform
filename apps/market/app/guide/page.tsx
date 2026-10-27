import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {baseLabel,CATS,n,nation,pct,SITE,status} from '../../lib/data';
export const metadata:Metadata={title:'온누리상품권 사용처 확인 방법 — 지류·디지털 차이, 가맹점 찾기',description:`온누리상품권 사용처(가맹점) 확인 방법: 지류형과 디지털형 가맹점 차이, 내 주변 가맹점 찾기, 결제 전 확인할 것. 전국 가맹점 ${n(nation.n)}곳 기준.`,alternates:{canonical:'/guide'}};
export default function Guide(){
  const base=baseLabel(status.base);
  return <div className="page mk-guide"><nav className="crumbs"><Link href="/">홈</Link> › 온누리 안내</nav>
    <h1>온누리상품권 사용처, 이렇게 확인하세요</h1>
    <p className="mk-lead">온누리상품권은 등록된 <b>가맹점</b>에서만 쓸 수 있어요. 가맹점은 대부분 전통시장과 골목형상점가 같은 상점가 안에 있고, {base} 기준 전국에 {n(nation.n)}곳이에요.</p>
    <section><h2>1. 내 상품권이 지류형인지 디지털형인지 확인</h2>
      <p>가맹점 목록에는 가게마다 <b>지류형(종이) 가맹</b>과 <b>디지털형(모바일·카드) 가맹</b>이 따로 적혀 있어요. 이 목록의 가게는 모두 지류형 가맹점이고, 그중 {n(nation.d)}곳({pct(nation.d,nation.n)}%)이 디지털형도 받아요. 디지털 상품권을 쓰려면 시장 페이지에서 ‘📱 디지털 되는 곳’을 누르세요.</p></section>
    <section><h2>2. 내 주변 가맹점 찾기</h2><ol>
      <li><Link href="/">첫 화면</Link>에서 ‘내 주변 온누리상품권 사용처 보기’를 누르면 가까운 시장·상점가와 가맹점 수가 나와요.</li>
      <li>품목 칩을 누르면 그 품목 가게만 보여요 — {(['food','cafe','meat','fruit','beauty'] as const).map(c=>CATS[c].label).join('·')} 등.</li>
      <li>가게를 누르면 소속 시장, 디지털 가맹 여부, 지도에서 찾은 가게 위치와 🧭 길찾기가 나와요.</li></ol></section>
    <section><h2>3. 결제 전에 확인할 것</h2><ul>
      <li>같은 시장 안에서도 가맹하지 않은 가게가 있어요. 가게에 가맹점 표시가 있는지 보거나 물어보세요.</li>
      <li>가맹 등록·해지는 수시로 바뀌어요. 이 목록은 {base} 기준 공식 목록이라 그 뒤 바뀐 곳은 빠져 있을 수 있어요.</li>
      <li>구매 한도·할인율·환불 같은 상품권 자체의 규칙은 발행처 공식 안내를 확인하세요. 이 사이트는 가맹점 찾기만 도와 드려요.</li></ul></section>
    <Faq items={[
      ['온누리상품권은 어디서 쓸 수 있나요?',`가맹점으로 등록된 전통시장·상점가의 가게에서 쓸 수 있어요. ${base} 기준 ${n(nation.n)}곳이에요.`],
      ['지류형과 디지털형 사용처가 다른가요?',`네, 가게마다 따로 가맹해요. ${n(nation.n)}곳 중 ${n(nation.d)}곳(${pct(nation.d,nation.n)}%)이 디지털형도 받고, ${n(nation.paperOnly)}곳은 지류형만 받아요.`],
      ['가맹점인지 어떻게 알 수 있나요?','이 사이트에서 가게 이름이나 시장 이름으로 찾아보거나, 가게의 가맹점 표시를 확인하세요. 목록에 없더라도 기준일 뒤에 새로 가맹했을 수 있어요.'],
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/'],['온누리 안내',SITE+'/guide']])}/>
  </div>;
}
