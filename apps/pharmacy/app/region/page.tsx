import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,regions,sidos,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'지역별 약국 · 시군구 심야·일요일·공휴일 약국',description:`전국 ${regions.length}개 시군구 약국 ${n(status.count)}곳. 지역을 골라 지금 문 연 약국과 심야·일요일·공휴일 약국을 보세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별 약국</nav>
    <h1>지역별 약국</h1>
    <p>시군구를 고르면 지금 영업 중인 약국과 심야·일요일·공휴일 약국을 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">{n(s.count)}곳</span></h2>
      <div className="ph-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{r.zone}</b><span>{n(r.count)}곳</span></Link>)}</div></section>)}
    <Faq items={[['약국이 가장 많은 시도는 어디인가요?',`${top.slice(0,3).map(t=>`${t.name} ${n(t.count)}곳`).join(', ')} 순입니다(${updated()} 기준).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 약국',SITE+'/'],['지역별 약국',SITE+'/region']])}/>
  </div>;
}
