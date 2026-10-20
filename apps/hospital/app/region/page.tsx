import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,regions,sidos,SITE,status,updated,zoneOf} from '../../lib/data';
export const metadata:Metadata={title:'지역별 병원 · 시군구 과목별·야간·주말 진료',description:`전국 ${regions.length}개 시군구 병·의원 ${n(status.count)}곳. 지역을 골라 과목별 병원과 야간·일요일·공휴일 진료 병원을 보세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별 병원</nav>
    <h1>지역별 병원</h1>
    <p>시군구를 고르면 과목별 병원과 지금 진료 중인 곳, 야간·주말 진료 병원을 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">{n(s.count)}곳</span></h2>
      <div className="hp-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{zoneOf(r)}</b><span>{n(r.count)}곳</span></Link>)}</div></section>)}
    <Faq items={[['병원이 가장 많은 시도는 어디인가요?',`${top.slice(0,3).map(t=>`${t.name} ${n(t.count)}곳`).join(', ')} 순입니다(${updated()} 기준).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 병원',SITE+'/'],['지역별 병원',SITE+'/region']])}/>
  </div>;
}
