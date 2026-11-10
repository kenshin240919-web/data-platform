import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {StockFinder} from './_components/StockFinder';
import {Ad} from './_components/Ad';
import {AREAS} from '../lib/areas';
import {GROUPS,ITEMS,seasonal} from '../lib/items';
import {SITE} from '../lib/fmt';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const top=seasonal();const first=top[0];
  return <div className="page sk-home">
    <section className="sk-hero"><h1>그거 근처 매장에 있어?</h1>
      <p>급하게 필요한 물건, <b>내 동네 다이소 어느 매장에 있는지</b> 가까운 순으로</p></section>
    <StockFinder q={first.q} label={first.name} areas={AREAS} editable/>
    <section><h2>지금 많이 찾는 물건</h2><div className="sk-jump">{top.slice(0,10).map(i=><Link key={i.slug} href={`/daiso/${i.slug}`}>{i.emoji} {i.name}</Link>)}</div></section>
    <Ad/>
    {GROUPS.map(g=><section key={g}><h2>{g}</h2><div className="sk-jump">{ITEMS.filter(i=>i.group===g).map(i=><Link key={i.slug} href={`/daiso/${i.slug}`}>{i.emoji} {i.name}</Link>)}</div></section>)}
    <section className="sk-guide"><h2>🧺 이렇게 쓰세요</h2><ol>
      <li><b>찾는 물건을 고르거나 검색하세요</b><span>‘핫팩’처럼 검색하면 다이소몰에 있는 상품 후보가 나와요.</span></li>
      <li><b>동네(시군구)를 고르세요</b><span>‘내 위치 주변 보기’를 누르면 가까운 시군구를 알아서 골라요. 옆 동네도 눌러 볼 수 있어요.</span></li>
      <li><b>가까운 매장부터 수량을 확인하세요</b><span>매장을 누르면 영업 시간·전화·길찾기가 나와요. 급하면 출발 전에 전화로 확인하세요.</span></li>
    </ol></section>
    <Faq items={[
      ['다이소 재고는 어떻게 확인하나요?','이 사이트에서 물건을 고르고 동네를 고르면, 다이소몰에 공개된 매장별 재고를 가까운 순으로 보여 드립니다.'],
      ['재고 수량은 정확한가요?','다이소몰에 공개된 정보를 5분마다 새로 받아 보여 드리지만 실제 매장과 다를 수 있습니다. 급하면 매장에 전화로 확인하세요.'],
      ['수량 확인 필요는 무슨 뜻인가요?','그 매장의 수량이 공개되지 않은 경우입니다. 매장에 전화로 확인하세요.'],
      ['다이소 공식 사이트인가요?','아니요. 다이소와 관계없는 비공식 안내입니다.'],
    ]}/>
    <Connect items={genericFor('stock')}/>
    <JsonLd data={breadcrumbLd([['내근처 재고',SITE+'/']])}/>
  </div>;
}
