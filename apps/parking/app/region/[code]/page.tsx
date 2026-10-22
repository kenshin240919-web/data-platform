import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {LotList} from '../../_components/LotList';
import {CONDITIONS,COND_MIN,feeFor,feeLine,lotPath,n,refMonth,region,regions,SITE,slim,type Cond} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  return {title:`${r.name} 주차장 ${n(r.count)}곳 · 공영·무료 주차장 요금`,description:`${r.name} 주차장 ${n(r.count)}곳: 무료 ${n(r.cond.free)}곳, 24시간 ${n(r.cond.allday)}곳${r.hour!=null?`, 유료 1시간 보통 ${n(r.hour)}원`:''}. 주차 시간별 예상 요금으로 싼 곳을 찾으세요.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const big=[...r.items].sort((a,b)=>(b.spaces??0)-(a.spaces??0))[0];
  const cheap=r.items.filter(p=>p.charge!=='무료'&&(feeFor(p,60)??0)>0).sort((a,b)=>feeFor(a,60)!-feeFor(b,60)!)[0];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 주차장</Link> › {r.name}</nav>
    <h1>{r.name} 주차장</h1>
    <p className="pk-answer"><b>{r.name}</b>에 등록된 주차장은 <b>{n(r.count)}곳</b>(주차면 {n(r.spaces)}면)이고, 이 중 무료 <b>{n(r.cond.free)}곳</b>, 24시간 {n(r.cond.allday)}곳이에요.{r.hour!=null&&<> 유료 주차장 1시간 요금은 보통 <b>{n(r.hour)}원</b>이에요.</>} <span className="muted">(지자체 기준일 {refMonth(r.items)})</span></p>
    <div className="pk-jump">{(Object.keys(CONDITIONS) as Cond[]).filter(c=>r.cond[c]>=COND_MIN).map(c=><Link key={c} href={`/region/${r.id}/${c}`}>{r.zone} {CONDITIONS[c].title} <small>{n(r.cond[c])}</small></Link>)}</div>
    <section><h2>{r.name} 주차장 목록</h2><LotList items={r.items.map(slim)}/>
      <noscript><ul>{r.items.map(p=><li key={p.id}><a href={lotPath(p.id)}>{p.name}</a> · {feeLine(p)}</li>)}</ul></noscript></section>
    <AdSlot/>
    <Faq items={([
      [`${r.name}에 공영 주차장은 몇 곳인가요?`,`지자체 등록 기준 ${r.name} 주차장은 ${n(r.count)}곳이며 무료 주차장은 ${n(r.cond.free)}곳입니다.`],
      [`${r.name} 주차장 1시간 요금은 얼마인가요?`,r.hour!=null?`요금을 계산할 수 있는 유료 주차장 기준 1시간 요금의 중앙값은 ${n(r.hour)}원입니다${cheap?`(가장 싼 곳: ${cheap.name} ${n(feeFor(cheap,60)!)}원)`:''}.`:''],
      [`${r.name}에서 가장 큰 주차장은?`,big?.spaces?`${big.name}(${n(big.spaces)}면)입니다${big.addr?` — ${big.addr}`:''}.`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect items={linksNear(r.lat,r.lon,'parking')}/>
    <JsonLd data={breadcrumbLd([['내근처 주차장',SITE+'/'],['지역별 주차장',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
