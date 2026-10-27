import type {Metadata} from 'next';
import Link from 'next/link';
import {breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,SITE,sidos} from '../../lib/data';
export const metadata:Metadata={title:'지역별 온누리상품권 사용처 — 시도·시군구',description:'시도·시군구별 온누리상품권 가맹점 수와 전통시장·상점가 목록. 우리 동네 온누리상품권 쓰는 곳을 찾아보세요.',alternates:{canonical:'/region'}};
export default function Regions(){
  return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 지역별</nav><h1>지역별 온누리상품권 사용처</h1>
    {sidos.map(s=><section key={s.slug} id={s.name}><h2><Link href={`/sido/${s.slug}`}>{s.full}</Link> <span className="muted">{n(s.n)}곳</span></h2>
      <div className="mk-regions">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}>{r.zone}<span>{n(r.n)}곳</span></Link>)}</div></section>)}
    <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/'],['지역별',SITE+'/region']])}/>
  </div>;
}
