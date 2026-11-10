import type {Metadata} from 'next';
import Link from 'next/link';
import {breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {GROUPS,ITEMS} from '../../lib/items';
import {SITE} from '../../lib/fmt';
export const metadata:Metadata={title:'자주 찾는 물건 · 다이소 재고 찾기',description:`핫팩·뽁뽁이·건전지·우산·수납함 등 자주 찾는 물건 ${ITEMS.length}가지. 고르는 법과 함께 내 동네 다이소 매장 재고를 확인하세요.`,alternates:{canonical:'/daiso'}};
export default function Page(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 자주 찾는 물건</nav>
  <h1>자주 찾는 물건</h1>
  <p className="muted">물건을 누르면 고르는 법과 함께 내 동네 다이소 매장 재고를 보여 드려요.</p>
  {GROUPS.map(g=><section key={g}><h2>{g}</h2><div className="sk-items">{ITEMS.filter(i=>i.group===g).map(i=><Link key={i.slug} href={`/daiso/${i.slug}`}><b>{i.emoji} {i.name}</b><span>{i.lead.slice(0,52)}…</span></Link>)}</div></section>)}
  <JsonLd data={breadcrumbLd([['내근처 재고',SITE+'/'],['자주 찾는 물건',SITE+'/daiso']])}/>
</div>;}
