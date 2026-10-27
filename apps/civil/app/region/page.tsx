import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {n,nation,regions,sidos,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'지역별 무인민원발급기·주민센터·우체국',description:`전국 ${regions.length}개 시군구의 무인민원발급기 ${n(nation.kinds.kiosk)}대, 주민센터 ${n(nation.kinds.office)}곳, 우체국 ${n(nation.kinds.post)}곳, 여권 발급 기관. 지역을 골라 가까운 곳을 찾으세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const top=[...sidos].sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별</nav>
    <h1>지역별 민원·서류</h1>
    <p>시군구를 고르면 무인민원발급기, 주민센터, 구청 민원실, 여권 발급, 우체국을 볼 수 있어요. <span className="muted">({updated()} 기준 {n(status.count)}곳)</span></p>
    {sidos.map(s=><section key={s.name} id={s.name}><h2>{s.name} <span className="muted">{n(s.count)}곳</span></h2>
      <div className="cv-sidos">{s.regions.map(r=><Link key={r.id} href={`/region/${r.id}`}><b>{r.zone}</b><span>발급기 {n(r.kinds.kiosk)}</span></Link>)}</div></section>)}
    <Faq items={[['민원 장소가 가장 많은 시도는?',`${top.slice(0,3).map(t=>`${t.name} ${n(t.count)}곳`).join(', ')} 순입니다(${updated()} 기준).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 서류',SITE+'/'],['지역별',SITE+'/region']])}/>
  </div>;
}
