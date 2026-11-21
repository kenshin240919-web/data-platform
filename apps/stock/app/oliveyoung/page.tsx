import type {Metadata} from 'next';
import Link from 'next/link';
import {breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {OY_GROUPS,OY_ITEMS} from '../../lib/olive';
import {SITE} from '../../lib/fmt';
export const metadata:Metadata={title:'올리브영 자주 찾는 상품 · 내 주변 매장 재고',description:`핸드크림·립밤·선크림·클렌징폼 등 올리브영에서 자주 찾는 상품 ${OY_ITEMS.length}가지. 고를 때 보는 것과 함께 내 주변 올리브영 매장 재고를 확인하세요.`,alternates:{canonical:'/oliveyoung'}};
export default function Page(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 올리브영</nav>
  <h1>💄 올리브영 자주 찾는 상품</h1>
  <p className="muted">상품을 누르면 고를 때 보는 것과 함께 내 주변 올리브영 매장 재고를 보여 드려요.</p>
  {OY_GROUPS.map(g=><section key={g}><h2>{g}</h2><div className="sk-items">{OY_ITEMS.filter(i=>i.group===g).map(i=><Link key={i.slug} href={`/oliveyoung/${i.slug}`}><b>{i.emoji} {i.name}</b><span>{i.lead.slice(0,52)}…</span></Link>)}</div></section>)}
  <p><Link href="/daiso">🧺 다이소에서 찾는 물건 보기 →</Link></p>
  <JsonLd data={breadcrumbLd([['내근처 재고',SITE+'/'],['올리브영',SITE+'/oliveyoung']])}/>
</div>;}
