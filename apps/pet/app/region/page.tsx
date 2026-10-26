import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,regions,sidos,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'지역별 동물병원·동물약국',description:`전국 ${regions.length}개 시군구의 동물병원·24시 동물병원·동물약국·펫호텔·애견 카페·펫택시 ${n(status.count)}곳. 지역을 골라 가까운 곳을 찾으세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.hospital-a.hospital);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별</nav>
    <h1>지역별 동물병원·동물약국</h1>
    <p>시군구를 고르면 동물병원(24시 포함)·동물약국·펫호텔·애견 카페·펫택시를 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">동물병원 {n(s.hospital)}곳</span></h2>
      <div className="pt-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{r.zone}</b><span>병원 {n(r.kinds.hospital)}{r.h24?` · 24시 ${r.h24}`:''}</span></Link>)}</div></section>)}
    <Faq items={[['동물병원이 가장 많은 시도는?',`${top.slice(0,3).map(t=>`${t.name} ${n(t.hospital)}곳`).join(', ')} 순입니다(${updated()} 기준, 지자체 신고).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 동물병원',SITE+'/'],['지역별',SITE+'/region']])}/>
  </div>;
}
