import type {Metadata} from 'next';
import Link from 'next/link';
import {breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {allFor,localItems,n,regions,SITE,sidoItems,sidoList} from '../../lib/data';
export const metadata:Metadata={title:'지역별 지원금·혜택 — 전국 시군구',description:'전국 시군구별로 받을 수 있는 지원금과 혜택 수를 모았어요. 시군구를 누르면 그 동네·시도·국가가 주는 혜택을 한 번에 볼 수 있어요.',alternates:{canonical:'/region'}};
export default function RegionIndex(){
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별</nav>
    <h1>지역별 지원금·혜택</h1>
    <p className="bf-lead">시군구를 고르면 그 동네가 따로 주는 혜택과 시도·국가 혜택을 함께 보여 드려요. 숫자는 그 시군구 주민이 볼 수 있는 혜택 수(시군구 + 시도 + 전국)예요.</p>
    {sidoList.map(s=><section key={s} id={s}><h2>{s} <span className="muted">시도 혜택 {n(sidoItems(s).length)}가지</span></h2>
      <div className="bf-regions">{regions.filter(r=>r.sido===s).sort((a,b)=>a.zone.localeCompare(b.zone,'ko')).map(r=><Link key={r.code} href={`/region/${r.code}`}>{r.zone}<span>{n(localItems(r.code).length)} · 전체 {n(allFor(r).length)}</span></Link>)}</div></section>)}
    <JsonLd data={breadcrumbLd([['내근처 혜택',SITE+'/'],['지역별',SITE+'/region']])}/>
  </div>;
}
