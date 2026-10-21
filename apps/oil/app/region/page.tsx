import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {regions,sidos,SITE,updated,won} from '../../lib/data';
export const metadata:Metadata={title:'지역별 휘발유 최저가 · 시군구 평균 기름값',description:`전국 ${regions.length}개 시군구의 오늘 평균 휘발유 가격과 가장 싼 주유소 20곳. 지역을 골라 최저가 주유소를 보세요.`,alternates:{canonical:'/region'}};
export default function Regions(){
  const cheap=[...regions].filter(r=>r.avg.B027?.price).sort((a,b)=>a.avg.B027!.price!-b.avg.B027!.price!);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 지역별 휘발유</nav>
    <h1>지역별 휘발유 최저가</h1>
    <p>시군구를 고르면 오늘 가장 싼 주유소 20곳을 볼 수 있어요. 숫자는 그 지역 평균 휘발유 가격입니다. <span className="muted">({updated()} 기준)</span></p>
    {sidos.map(s=><section key={s.code} id={s.code}><h2>{s.name} <span className="muted">평균 휘발유 {won(s.B027?.price)}</span></h2>
      <div className="oi-sidos">{s.regions.map(r=><Link key={r.code} href={`/region/${r.code}`}><b>{r.name}</b><span>{won(r.avg.B027?.price)}</span></Link>)}</div></section>)}
    <Faq items={[['평균 휘발유가 가장 싼 시군구는 어디인가요?',cheap.length?`${updated()} 기준 ${cheap.slice(0,3).map(r=>`${r.label} ${won(r.avg.B027!.price)}`).join(', ')} 순입니다.`:'자료가 없습니다.'],
      ['평균 휘발유가 가장 비싼 시군구는 어디인가요?',cheap.length?`${cheap.slice(-3).reverse().map(r=>`${r.label} ${won(r.avg.B027!.price)}`).join(', ')} 순입니다.`:'자료가 없습니다.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 주유소',SITE+'/'],['지역별 휘발유',SITE+'/region']])}/>
  </div>;
}
