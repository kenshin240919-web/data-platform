import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {StatusList} from '../../_components/StatusList';
import {CONDITIONS,n,pharmacyPath,region,regions,SITE,slim,updated,weekLine,type Cond} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  return {title:`${r.name} 약국 ${n(r.count)}곳 · 지금 문 연 약국·심야·일요일`,description:`${r.name} 약국 ${n(r.count)}곳: 심야(밤 10시 이후) ${n(r.cond.night)}곳, 일요일 ${n(r.cond.sunday)}곳, 공휴일 ${n(r.cond.holiday)}곳. 지금 영업 중인 약국과 요일별 운영 시간.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const sun=r.items.filter(CONDITIONS.sunday.test).slice(0,3);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 약국</Link> › {r.name}</nav>
    <h1>{r.name} 약국</h1>
    <p className="ph-answer"><b>{r.name}</b> 약국 <b>{n(r.count)}곳</b> 중 밤 10시 이후 {n(r.cond.night)}곳, 일요일 {n(r.cond.sunday)}곳, 공휴일 {n(r.cond.holiday)}곳이 문을 열어요. <span className="muted">({updated()} 기준)</span></p>
    <div className="ph-jump">{(Object.keys(CONDITIONS) as Cond[]).filter(c=>r.cond[c]).map(c=><Link key={c} href={`/region/${r.id}/${c}`}>{r.zone} {CONDITIONS[c].title} <small>{n(r.cond[c])}</small></Link>)}</div>
    <section><h2>{r.name} 약국 목록</h2><StatusList items={r.items.map(slim)}/>
      <noscript><ul>{r.items.map(p=><li key={p.id}><a href={pharmacyPath(p.id)}>{p.name}</a> · {weekLine(p)}</li>)}</ul></noscript></section>
    <AdSlot/>
    <Faq items={[
      [`${r.name}에 약국은 몇 곳인가요?`,`${updated()} 기준 ${r.name}에는 약국 ${n(r.count)}곳이 있습니다.`],
      [`${r.name}에서 일요일에 여는 약국은?`,r.cond.sunday?`일요일 운영 시간이 등록된 약국은 ${n(r.cond.sunday)}곳입니다(예: ${sun.map(p=>p.name).join(', ')}).`:'일요일 운영 시간이 등록된 약국이 없습니다.'],
      [`${r.name}에서 밤늦게 여는 약국은?`,`평일 밤 10시 이후까지 여는 약국은 ${n(r.cond.night)}곳입니다.`],
    ]}/>
    <Connect items={linksNear(r.lat,r.lon,'pharmacy')}/>
    <JsonLd data={breadcrumbLd([['내근처 약국',SITE+'/'],['지역별 약국',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
