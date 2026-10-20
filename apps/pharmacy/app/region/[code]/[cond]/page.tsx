import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {StatusList} from '../../../_components/StatusList';
import {CONDITIONS,DAY_LABEL,hm,n,pharmacyPath,region,regions,SITE,slim,updated,type Cond} from '../../../../lib/data';

// 시군구 × 조건(심야·일요일·공휴일) 페이지: 해당 약국이 있는 곳만 만듦(내용 없는 페이지는 만들지 않음).
export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>(Object.keys(CONDITIONS) as Cond[]).filter(c=>r.cond[c]).map(c=>({code:r.id,cond:c})));}
type P={params:Promise<{code:string;cond:string}>};
const get=async(params:P['params'])=>{const {code,cond}=await params;const r=region(code);const c=CONDITIONS[cond as Cond];return r&&c?{r,c,cond:cond as Cond,items:r.items.filter(c.test)}:null;};
const DAY:Record<Cond,string>={night:'5',sunday:'7',holiday:'8'};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const x=await get(params);if(!x)return {};
  return {title:`${x.r.name} ${x.c.title} ${n(x.items.length)}곳`,description:`${x.r.name}에서 ${x.c.desc} 약국 ${n(x.items.length)}곳: ${x.items.slice(0,5).map(p=>p.name).join(', ')}${x.items.length>5?' 등':''}. 운영 시간과 지금 영업 여부를 확인하세요.`,alternates:{canonical:`/region/${x.r.id}/${x.cond}`}};
}
export default async function CondPage({params}:P){
  const x=await get(params);if(!x||!x.items.length)notFound();
  const {r,c,cond,items}=x;const d=DAY[cond];
  const latest=[...items].sort((a,b)=>+(b.hours[d]?.[1]??0)-+(a.hours[d]?.[1]??0))[0];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 약국</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {c.title}</nav>
    <h1>{r.name} {c.title}</h1>
    <p className="ph-answer"><b>{r.name}</b>에서 {c.desc} 약국은 <b>{n(items.length)}곳</b>이에요.{latest?.hours[d]&&<> {cond==='night'?'평일':DAY_LABEL[d]} 가장 늦게까지 여는 곳은 <a href={pharmacyPath(latest.id)}><b>{latest.name}</b></a>({hm(latest.hours[d][1])}까지)예요.</>} <span className="muted">({updated()} 기준)</span></p>
    <div className="ph-jump">{(Object.keys(CONDITIONS) as Cond[]).filter(k=>k!==cond&&r.cond[k]).map(k=><Link key={k} href={`/region/${r.id}/${k}`}>{r.zone} {CONDITIONS[k].title} <small>{n(r.cond[k])}</small></Link>)}<Link href={`/region/${r.id}`}>{r.zone} 약국 전체 <small>{n(r.count)}</small></Link></div>
    <section><h2>{r.name} {c.title} 목록</h2><StatusList items={items.map(slim)}/>
      <noscript><ul>{items.map(p=><li key={p.id}><a href={pharmacyPath(p.id)}>{p.name}</a>{p.hours[d]&&<> · {DAY_LABEL[d]} {hm(p.hours[d][0])}~{hm(p.hours[d][1])}</>}</li>)}</ul></noscript></section>
    <AdSlot/>
    <Faq items={[
      [`${r.name} ${c.title}은 몇 곳인가요?`,`${updated()} 기준 ${r.name}에서 ${c.desc} 약국은 ${n(items.length)}곳입니다.`],
      [`${r.name}에서 ${cond==='night'?'평일':DAY_LABEL[d]} 가장 늦게까지 여는 약국은?`,latest?.hours[d]?`${latest.name}이 ${hm(latest.hours[d][1])}까지 엽니다(${latest.address??''}).`:''],
    ].filter(([,a])=>a) as [string,string][]}/>
    <JsonLd data={breadcrumbLd([['내근처 약국',SITE+'/'],['지역별 약국',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[c.title,`${SITE}/region/${r.id}/${cond}`]])}/>
  </div>;
}
