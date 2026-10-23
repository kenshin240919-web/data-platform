import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,regions,sidos,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'지역별 자동차 정비소·검사소·세차장',description:`전국 ${regions.length}개 시군구의 자동차 정비소·검사소·세차장·배출가스 정비 ${n(status.count)}곳. 지역을 골라 가까운 곳을 찾으세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별</nav>
    <h1>지역별 정비소·검사소·세차장</h1>
    <p>시군구를 고르면 정비소(종합·소형·전문)·검사소·세차장·배출가스 정비를 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">{n(s.count)}곳</span></h2>
      <div className="sv-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{r.zone}</b><span>정비 {n(r.kinds.repair)}</span></Link>)}</div></section>)}
    <Faq items={[['정비소·세차장이 가장 많은 시도는?',`${top.slice(0,3).map(t=>`${t.name} ${n(t.count)}곳`).join(', ')} 순입니다(${updated()} 기준, 지자체 등록).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 서비스센터',SITE+'/'],['지역별',SITE+'/region']])}/>
  </div>;
}
