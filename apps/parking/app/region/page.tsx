import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,regions,sidos,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'지역별 주차장 · 시군구 공영·무료·24시간 주차장',description:`전국 ${regions.length}개 시군구 주차장 ${n(status.count)}곳. 지역을 골라 공영·무료·24시간 주차장과 예상 요금을 보세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별 주차장</nav>
    <h1>지역별 주차장</h1>
    <p>시군구를 고르면 공영·무료·24시간 주차장과 주차 시간별 예상 요금을 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">{n(s.count)}곳</span></h2>
      <div className="pk-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{r.zone}</b><span>{n(r.count)}곳</span></Link>)}</div></section>)}
    <Faq items={[['주차장이 가장 많이 등록된 시도는 어디인가요?',`${top.slice(0,3).map(t=>`${t.name} ${n(t.count)}곳`).join(', ')} 순입니다(${updated()} 기준, 지자체 등록 주차장).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 주차장',SITE+'/'],['지역별 주차장',SITE+'/region']])}/>
  </div>;
}
