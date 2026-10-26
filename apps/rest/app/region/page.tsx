import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,regions,sidos,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'지역별 찜질방·사우나·목욕탕',description:`전국 ${regions.length}개 시군구의 찜질방·사우나·목욕탕, 1인 목욕·세신샵, 안마원, 피부관리실 ${n(status.count)}곳. 지역을 골라 가까운 곳을 찾으세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별</nav>
    <h1>지역별 찜질방·목욕탕·휴식</h1>
    <p>시군구를 고르면 찜질방·사우나·목욕탕, 1인 목욕·세신샵, 안마원, 피부관리실을 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">{n(s.count)}곳</span></h2>
      <div className="rs-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{r.zone}</b><span>찜질·목욕 {n(r.kinds.sauna)}</span></Link>)}</div></section>)}
    <Faq items={[['휴식 업소가 가장 많은 시도는?',`${top.slice(0,3).map(t=>`${t.name} ${n(t.count)}곳`).join(', ')} 순입니다(${updated()} 기준, 지자체 신고).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 휴식',SITE+'/'],['지역별',SITE+'/region']])}/>
  </div>;
}
