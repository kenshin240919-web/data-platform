import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,regions,sidos,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'지역별 학원 · 시군구 학원 수와 수강료',description:`전국 ${regions.length}개 시군구의 학원·교습소 수와 과목별 공개 수강료. 우리 동네를 골라 보세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별 학원</nav>
    <h1>지역별 학원</h1>
    <p>시군구를 고르면 학원 수, 과목별 학원 수와 공개 수강료, 학원 목록을 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">{n(s.count)}곳</span></h2>
      <div className="ac-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{r.zone}</b><span>{n(r.count)}곳</span></Link>)}</div></section>)}
    <Faq items={[['학원이 가장 많은 시도는 어디인가요?',`${top[0].name} ${n(top[0].count)}곳, ${top[1].name} ${n(top[1].count)}곳, ${top[2].name} ${n(top[2].count)}곳 순입니다(${updated()} 기준).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 학원',SITE+'/'],['지역별 학원',SITE+'/region']])}/>
  </div>;
}
