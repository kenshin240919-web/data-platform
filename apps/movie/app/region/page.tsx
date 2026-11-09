import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,regions,sidos,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'지역별 영화관',description:`전국 ${regions.length}개 시군구의 영화관 ${n(status.count)}곳(상영관 ${n(status.screens)}개). 지역을 골라 극장과 오늘 남은 상영을 확인하세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별</nav>
    <h1>지역별 영화관</h1>
    <p>시군구를 고르면 그 지역 극장과 오늘 남은 상영을 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">{n(s.count)}곳</span></h2>
      <div className="mv-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{r.zone}</b><span>{n(r.count)}곳</span></Link>)}</div></section>)}
    <Faq items={[['영화관이 가장 많은 시도는?',`${top.slice(0,3).map(t=>`${t.name} ${n(t.count)}곳`).join(', ')} 순입니다(${updated()} 기준, 지자체 등록).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],['지역별',SITE+'/region']])}/>
  </div>;
}
