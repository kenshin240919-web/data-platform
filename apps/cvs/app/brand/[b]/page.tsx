import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearCvs} from '../../_components/NearCvs';
import {Ad} from '../../_components/Ad';
import {MedicineGuide} from '../../_components/Guide';
import {BRAND_ORDER,BRANDS,COND_MIN,eun,n,nation,regions,SITE,updated,type BrandKey} from '../../../lib/data';

// 브랜드별 전국 페이지(/brand/cu …): 내 주변 + 많은 지역. 브랜드는 상호로 나눈 것(본사 공식 목록 아님).
export const dynamicParams=false;
export function generateStaticParams(){return BRAND_ORDER.filter(b=>b!=='other').map(b=>({b}));}
type P={params:Promise<{b:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const b=(await params).b as BrandKey;if(!BRANDS[b]||b==='other')return {};
  return {title:`상비약 파는 ${BRANDS[b].title} 내 주변 ${n(nation.brands[b])}곳`,description:`안전상비의약품 판매자로 등록된 ${BRANDS[b].title} 매장 ${n(nation.brands[b])}곳을 가까운 순으로. 약국이 닫은 밤에도 해열진통제·소화제를 살 수 있는 곳 (${updated()} 기준).`,alternates:{canonical:`/brand/${b}`}};
}
export default async function BrandPage({params}:P){
  const b=(await params).b as BrandKey;if(!BRANDS[b]||b==='other')notFound();
  const top=[...regions].filter(r=>r.brands[b]>=COND_MIN).sort((x,y)=>y.brands[b]-x.brands[b]).slice(0,12);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › {BRANDS[b].label}</nav>
    <h1>상비약 파는 {BRANDS[b].title}</h1>
    <p className="cv-answer">안전상비의약품 판매자로 등록된 {eun(BRANDS[b].title)} 전국 <b>{n(nation.brands[b])}곳</b>이에요. <span className="muted">({updated()} 기준, 상호로 나눔)</span></p>
    <NearCvs brand={b}/>
    <div className="cv-jump">{BRAND_ORDER.filter(o=>o!==b&&o!=='other').map(o=><Link key={o} href={`/brand/${o}`}>{BRANDS[o].label} <small>{n(nation.brands[o])}</small></Link>)}<Link href="/">전체 보기</Link></div>
    <Ad/>
    {top.length>0&&<section><h2>{BRANDS[b].label} 상비약 매장 많은 지역</h2><ol className="cv-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/${b}`}><b>{r.name}</b><span>{n(r.brands[b])}곳</span></Link></li>)}</ol></section>}
    <MedicineGuide/>
    <Faq items={[[`상비약 파는 ${eun(BRANDS[b].title)} 몇 곳인가요?`,`${updated()} 기준 안전상비의약품 판매자로 등록된 ${eun(BRANDS[b].title)} 전국 ${n(nation.brands[b])}곳입니다(상호 기준).`],
      ...(top[0]?[[`${BRANDS[b].label} 상비약 매장이 가장 많은 지역은?`,`${top.slice(0,3).map(r=>`${r.name} ${n(r.brands[b])}곳`).join(', ')} 순입니다.`] as [string,string]]:[]),
      [`${BRANDS[b].title} 매장이면 모두 상비약을 파나요?`,'아니요. 시장·군수·구청장에게 안전상비의약품 판매자로 등록한 매장만 팔 수 있습니다. 이 사이트에는 등록된 매장만 있습니다.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 편의점',SITE+'/'],[BRANDS[b].label,`${SITE}/brand/${b}`]])}/>
  </div>;
}
