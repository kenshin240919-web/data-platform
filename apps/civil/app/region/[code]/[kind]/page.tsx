import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {PlaceList} from '../../../_components/PlaceList';
import {Ad} from '../../../_components/Ad';
import {COND_MIN,eun,hoursLine,KIND_ORDER,KINDS,n,ordered,placePath,region,regions,SITE,slim,updated,type Kind} from '../../../../lib/data';
export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>({code:r.id,kind:k})));}
type P={params:Promise<{code:string;kind:string}>};
const get=async(params:P['params'])=>{const {code,kind}=await params;const r=region(code);const k=kind as Kind;return r&&KINDS[k]?{r,k,items:ordered(r.items.filter(p=>p.kind===k))}:null;};
const unit=(k:Kind)=>k==='kiosk'?'대':'곳';
export async function generateMetadata({params}:P):Promise<Metadata>{
  const x=await get(params);if(!x)return {};
  return {title:`${x.r.name} ${KINDS[x.k].title} ${n(x.items.length)}${unit(x.k)}`,description:`${x.r.name} ${KINDS[x.k].title} ${n(x.items.length)}${unit(x.k)}: ${x.items.slice(0,5).map(p=>p.name).join(', ')}${x.items.length>5?' 등':''}. 운영 시간·위치를 확인하세요.`,alternates:{canonical:`/region/${x.r.id}/${x.k}`}};
}
export default async function KindPage({params}:P){
  const x=await get(params);if(!x||x.items.length<COND_MIN)notFound();
  const {r,k,items}=x;
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {KINDS[k].label}</nav>
    <h1>{r.name} {KINDS[k].title}</h1>
    <p className="cv-answer"><b>{r.name}</b> {eun(KINDS[k].title)} <b>{n(items.length)}{unit(k)}</b>이에요. <span className="muted">({updated()} 기준)</span></p>
    <div className="cv-jump">{KIND_ORDER.filter(o=>o!==k&&r.kinds[o]>=COND_MIN).map(o=><Link key={o} href={`/region/${r.id}/${o}`}>{KINDS[o].icon} {r.zone} {KINDS[o].label} <small>{n(r.kinds[o])}</small></Link>)}<Link href={`/region/${r.id}`}>{r.zone} 전체 <small>{n(r.count)}</small></Link></div>
    <section><h2>{r.name} {KINDS[k].label} 목록</h2><PlaceList items={items.map(slim)} kind={k}/>
      <noscript><ul>{items.slice(0,300).map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> · {hoursLine(p)}</li>)}</ul></noscript></section>
    <Ad/>
    <Faq items={[[`${r.name} ${eun(KINDS[k].title)} 몇 ${unit(k)}인가요?`,`${updated()} 기준 ${n(items.length)}${unit(k)}입니다: ${items.slice(0,5).map(p=>p.name).join(', ')}${items.length>5?' 등':''}.`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 서류',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[KINDS[k].label,`${SITE}/region/${r.id}/${k}`]])}/>
  </div>;
}
