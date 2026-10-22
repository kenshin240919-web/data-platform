import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {LotList} from '../../../_components/LotList';
import {CONDITIONS,COND_MIN,feeLine,lotPath,n,refMonth,region,regions,SITE,slim,type Cond} from '../../../../lib/data';

// 시군구 × 조건(무료·24시간) 페이지: 해당 주차장이 COND_MIN곳 이상인 곳만 만듦(내용 없는 페이지는 만들지 않음).
export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>(Object.keys(CONDITIONS) as Cond[]).filter(c=>r.cond[c]>=COND_MIN).map(c=>({code:r.id,cond:c})));}
type P={params:Promise<{code:string;cond:string}>};
const get=async(params:P['params'])=>{const {code,cond}=await params;const r=region(code);const c=CONDITIONS[cond as Cond];return r&&c?{r,c,cond:cond as Cond,items:r.items.filter(c.test)}:null;};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const x=await get(params);if(!x)return {};
  return {title:`${x.r.name} ${x.c.title} ${n(x.items.length)}곳`,description:`${x.r.name}에서 ${x.c.desc} 주차장 ${n(x.items.length)}곳: ${x.items.slice(0,5).map(p=>p.name).join(', ')}${x.items.length>5?' 등':''}. 위치·운영 시간·주차면 수를 확인하세요.`,alternates:{canonical:`/region/${x.r.id}/${x.cond}`}};
}
export default async function CondPage({params}:P){
  const x=await get(params);if(!x||x.items.length<COND_MIN)notFound();
  const {r,c,cond,items}=x;
  const big=[...items].sort((a,b)=>(b.spaces??0)-(a.spaces??0))[0];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 주차장</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {c.title}</nav>
    <h1>{r.name} {c.title}</h1>
    <p className="pk-answer"><b>{r.name}</b>에서 {c.desc} 주차장은 <b>{n(items.length)}곳</b>이에요.{big?.spaces?<> 가장 큰 곳은 <a href={lotPath(big.id)}><b>{big.name}</b></a>({n(big.spaces)}면)예요.</>:null} <span className="muted">(지자체 기준일 {refMonth(items)})</span></p>
    <div className="pk-jump">{(Object.keys(CONDITIONS) as Cond[]).filter(k=>k!==cond&&r.cond[k]>=COND_MIN).map(k=><Link key={k} href={`/region/${r.id}/${k}`}>{r.zone} {CONDITIONS[k].title} <small>{n(r.cond[k])}</small></Link>)}<Link href={`/region/${r.id}`}>{r.zone} 주차장 전체 <small>{n(r.count)}</small></Link></div>
    <section><h2>{r.name} {c.title} 목록</h2><LotList items={items.map(slim)}/>
      <noscript><ul>{items.map(p=><li key={p.id}><a href={lotPath(p.id)}>{p.name}</a> · {feeLine(p)}</li>)}</ul></noscript></section>
    <AdSlot/>
    <Faq items={[
      [`${r.name} ${c.title}은 몇 곳인가요?`,`지자체 등록 기준 ${r.name}에서 ${c.desc} 주차장은 ${n(items.length)}곳입니다.`],
      ...(big?.spaces?[[`${r.name} ${c.title} 중 가장 큰 곳은?`,`${big.name}(${n(big.spaces)}면)입니다${big.addr?` — ${big.addr}`:''}.`] as [string,string]]:[]),
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 주차장',SITE+'/'],['지역별 주차장',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[c.title,`${SITE}/region/${r.id}/${cond}`]])}/>
  </div>;
}
