import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,nation,regions,sidos,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'지역별 관할 고용센터·직업소개소·새일센터',description:`전국 ${regions.length}개 시군구의 관할 고용센터, 직업소개소 ${n(nation.kinds.agency+nation.kinds.free)}곳, 새일센터 ${n(nation.kinds.women)}곳, 노인일자리 기관 ${n(nation.kinds.senior)}곳. 지역을 골라 확인하세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별</nav>
    <h1>지역별 일자리 기관</h1>
    <p>시군구를 고르면 관할 고용센터와 직업소개소·새일센터·노인일자리 기관을 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">{n(s.count)}곳</span></h2>
      <div className="jb-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{r.zone}</b><span>소개소 {n(r.kinds.agency+r.kinds.free)}</span></Link>)}</div></section>)}
    <Faq items={[['일자리 기관이 가장 많은 시도는?',`${top.slice(0,3).map(t=>`${t.name} ${n(t.count)}곳`).join(', ')} 순입니다(${updated()} 기준).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['지역별',SITE+'/region']])}/>
  </div>;
}
