import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,regions,sidos,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'지역별 학교 · 시군구 초·중·고등학교',description:`전국 ${regions.length}개 시군구의 초·중·고등학교 ${n(status.count)}곳. 지역을 골라 우리 학교 급식·학사일정을 보세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별 학교</nav>
    <h1>지역별 학교</h1>
    <p>시군구를 고르면 그 지역 초·중·고등학교 목록이 나오고, 학교를 누르면 오늘 급식·학사일정·시간표를 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">{n(s.count)}곳</span></h2>
      <div className="sc-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{r.zone}</b><span>{n(r.count)}곳</span></Link>)}</div></section>)}
    <Faq items={[['학교가 가장 많은 시도는 어디인가요?',`${top.slice(0,3).map(t=>`${t.name} ${n(t.count)}곳`).join(', ')} 순입니다(${updated()} 기준).`]]}/>
    <JsonLd data={breadcrumbLd([['내 학교',SITE+'/'],['지역별 학교',SITE+'/region']])}/>
  </div>;
}
