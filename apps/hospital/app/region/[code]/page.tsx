import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {LiveList} from '../../_components/LiveList';
import {CONDITIONS,COND_KEY,DEPTS,DEPT_ICON,MIN_DEPT,n,region,regions,SITE,updated,zoneOf} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  return {title:`${r.name} 병원 ${n(r.count)}곳 · 지금 진료 중·야간·주말`,description:`${r.name} 병·의원 ${n(r.count)}곳: 소아청소년과 ${n(r.depts.pediatrics?.count??0)}곳, 야간 진료 ${n(r.cond.night)}곳, 일요일 ${n(r.cond.sun)}곳, 공휴일 ${n(r.cond.hol)}곳, 응급실 ${n(r.er.length)}곳.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const ds=Object.entries(r.depts).filter(([,d])=>d.count>=MIN_DEPT).sort((a,b)=>b[1].count-a[1].count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 병원</Link> › {r.name}</nav>
    <h1>{r.name} 병원</h1>
    <p className="hp-answer"><b>{r.name}</b> 병·의원 <b>{n(r.count)}곳</b> 중 야간 진료 {n(r.cond.night)}곳, 일요일 {n(r.cond.sun)}곳, 공휴일 {n(r.cond.hol)}곳{r.er.length?<>, 응급실 {n(r.er.length)}곳</>:''}이에요. <span className="muted">({updated()} 기준)</span></p>
    <div className="hp-dept-grid">{ds.map(([k,d])=><Link key={k} href={`/region/${r.id}/${k}`}><span aria-hidden="true">{DEPT_ICON[k]}</span><b>{DEPTS[k]}</b><small>{n(d.count)}곳{d.sun?` · 일요일 ${n(d.sun)}`:''}</small></Link>)}</div>
    <div className="hp-jump">{Object.entries(COND_KEY).filter(([,k])=>r.cond[k]).map(([slug,k])=><Link key={slug} href={`/region/${r.id}/${slug}`}>{zoneOf(r)} {CONDITIONS[slug as keyof typeof CONDITIONS].title} <small>{n(r.cond[k])}</small></Link>)}</div>
    <LiveList title={`${r.name} 병원 목록`} query={{region:r.id}} initial={r.top}/>
    <AdSlot/>
    {r.er.length>0&&<section><h2>🚑 {r.name} 응급실</h2><ul className="hp-links">{r.er.map(c=><li key={c.id}><a href={`/hospital/${c.id}`}>{c.name}</a> <span className="muted">· {c.address}</span></li>)}</ul></section>}
    <Faq items={[
      [`${r.name}에 병원은 몇 곳인가요?`,`${updated()} 기준 ${r.name}에는 병·의원 ${n(r.count)}곳(${Object.entries(r.divs).slice(0,4).map(([k,v])=>`${k} ${n(v)}곳`).join(', ')})이 있습니다.`],
      [`${r.name}에서 일요일에 진료하는 병원은?`,`일요일 진료 시간이 등록된 곳은 ${n(r.cond.sun)}곳입니다${r.cond_top.sun.length?`(예: ${r.cond_top.sun.slice(0,3).map(c=>c.name).join(', ')})`:''}.`],
      [`${r.name} 소아청소년과는 몇 곳인가요?`,r.depts.pediatrics?`소아청소년과를 진료과목으로 신고한 곳은 ${n(r.depts.pediatrics.count)}곳, 그중 일요일 진료 ${n(r.depts.pediatrics.sun)}곳·야간 진료 ${n(r.depts.pediatrics.night)}곳입니다.`:'소아청소년과를 신고한 곳이 없습니다.'],
    ]}/>
    {r.lat!=null&&<Connect items={linksNear(r.lat,r.lon!,'hospital')}/>}
    <JsonLd data={breadcrumbLd([['내근처 병원',SITE+'/'],['지역별 병원',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
