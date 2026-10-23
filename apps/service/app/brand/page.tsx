import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {BRANDS} from '../../lib/brands';
import {SITE} from '../../lib/fmt';
export const metadata:Metadata={title:'가전·휴대폰 서비스센터 고객센터 번호 · 삼성·LG·코웨이·쿠쿠·SK매직·위니아·Apple',description:'삼성전자서비스 1588-3366, LG전자 1544-7777, 코웨이 1588-5200, 쿠쿠 1588-8899 등 가전·휴대폰 서비스센터 고객센터 번호와 접수 방법을 공식 누리집 기준으로 정리했어요.',alternates:{canonical:'/brand'}};
export default function Brands(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 가전·휴대폰</nav>
  <h1>가전·휴대폰 서비스센터</h1>
  <p className="sv-answer">가전·휴대폰 서비스센터는 공공 데이터가 없어 위치 목록 대신 <b>공식 누리집에서 확인한 고객센터 번호와 접수 방법</b>을 모았어요. 가까운 센터는 각 브랜드의 공식 ‘센터 찾기’에서 확인하세요.</p>
  <div className="sv-brands">{BRANDS.map(b=><Link key={b.slug} href={`/brand/${b.slug}`} className="sv-brand"><span aria-hidden="true">{b.icon}</span><span><b>{b.name}</b><small>{b.phones[0]?.tel??'공식 지원 페이지'} · {b.products.split('·').slice(0,3).join('·')}</small></span></Link>)}</div>
  <Faq items={[
    ['삼성전자서비스 고객센터 번호는?','대표전화는 1588-3366입니다(삼성전자서비스 누리집 기준, 2026-10-23 확인).'],
    ['LG전자 서비스센터 번호는?','LG전자 고객센터(구매·서비스·구독)는 1544-7777이며 전화상담은 평일 09:00~18:00입니다(LG전자 누리집 기준).'],
    ['정수기·밥솥 A/S는 어디로 하나요?','코웨이 1588-5200, 쿠쿠 구매 제품 1588-8899(렌탈 1577-0010), SK매직 통합고객센터 1600-1661입니다. 렌탈 제품은 번호가 따로 있는 곳이 많아요.'],
  ]}/>
  <JsonLd data={breadcrumbLd([['내근처 서비스센터',SITE+'/'],['가전·휴대폰',SITE+'/brand']])}/>
</div>;}
