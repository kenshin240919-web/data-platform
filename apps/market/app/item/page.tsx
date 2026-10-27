import type {Metadata} from 'next';
import Link from 'next/link';
import {breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {CAT_ORDER,CATS,n,nation,SITE} from '../../lib/data';
export const metadata:Metadata={title:'품목별 온누리상품권 사용처 — 음식점·카페·정육·미용실…',description:'온누리상품권 되는 음식점·카페·정육점·수산·과일·반찬·미용실·약국·학원 등 품목별 가맹점 수와 많은 지역·시장.',alternates:{canonical:'/item'}};
export default function Items(){return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 품목별</nav><h1>품목별 온누리상품권 사용처</h1>
  <div className="mk-cats">{CAT_ORDER.map(c=><Link key={c} href={`/item/${c}`}><span aria-hidden="true">{CATS[c].icon}</span><span><b>{CATS[c].label}</b><small>{n(nation.cats[c])}곳 · {CATS[c].q}</small></span></Link>)}</div>
  <p className="muted small">품목은 가맹점이 직접 적은 ‘취급품목’으로 나눴어요. 비어 있으면 가게 이름으로 정했고, 그래도 모르면 ‘기타’예요.</p>
  <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/'],['품목별',SITE+'/item']])}/></div>;}
