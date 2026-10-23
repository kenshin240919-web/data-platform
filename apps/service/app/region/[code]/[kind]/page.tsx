import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {CenterList} from '../../../_components/CenterList';
import {centerPath,COND_MIN,KIND_ORDER,KINDS,n,region,regions,SITE,slim,updated,type Kind} from '../../../../lib/data';

// 시군구 × 종류(정비소·검사소·세차장·배출가스) 페이지: COND_MIN곳 이상인 곳만 만듦.
export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>({code:r.id,kind:k})));}
type P={params:Promise<{code:string;kind:string}>};
const get=async(params:P['params'])=>{const {code,kind}=await params;const r=region(code);const k=kind as Kind;return r&&KINDS[k]?{r,k,items:r.items.filter(p=>p.kind===k)}:null;};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const x=await get(params);if(!x)return {};
  return {title:`${x.r.name} ${KINDS[x.k].title} ${n(x.items.length)}곳`,description:`${x.r.name} ${KINDS[x.k].title} ${n(x.items.length)}곳: ${x.items.slice(0,5).map(p=>p.name).join(', ')}${x.items.length>5?' 등':''}. 위치·전화·${x.k==='repair'?'정비 종류':'운영 정보'}를 확인하세요.`,alternates:{canonical:`/region/${x.r.id}/${x.k}`}};
}
export default async function KindPage({params}:P){
  const x=await get(params);if(!x||x.items.length<COND_MIN)notFound();
  const {r,k,items}=x;const subs=Object.entries(items.reduce((a,p)=>(p.sub&&(a[p.sub]=(a[p.sub]??0)+1),a),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {KINDS[k].label}</nav>
    <h1>{r.name} {KINDS[k].title}</h1>
    <p className="sv-answer"><b>{r.name}</b>에 등록된 {KINDS[k].title}은 <b>{n(items.length)}곳</b>이에요{subs.length?` (${subs.map(([s,v])=>`${s} ${n(v)}`).join(' · ')})`:''}. <span className="muted">({updated()} 기준)</span></p>
    <div className="sv-jump">{KIND_ORDER.filter(o=>o!==k&&r.kinds[o]>=COND_MIN).map(o=><Link key={o} href={`/region/${r.id}/${o}`}>{KINDS[o].icon} {r.zone} {KINDS[o].label} <small>{n(r.kinds[o])}</small></Link>)}<Link href={`/region/${r.id}`}>{r.zone} 전체 <small>{n(r.count)}</small></Link>{k==='inspect'&&<Link href="/inspection">🗓️ 과태료 계산기</Link>}</div>
    {k==='inspect'&&<p className="sv-note">지자체가 등록한 검사소만 보여요. 빠진 곳이 있을 수 있으니 한국교통안전공단 검사소 찾기도 확인하세요.</p>}
    <section><h2>{r.name} {KINDS[k].label} 목록</h2><CenterList items={items.map(slim)} kind={k}/>
      <noscript><ul>{items.slice(0,300).map(p=><li key={p.id}><a href={centerPath(p.id)}>{p.name}</a>{p.sub?` · ${p.sub}`:''}</li>)}</ul></noscript></section>
    <AdSlot/>
    <Faq items={[[`${r.name} ${KINDS[k].title}은 몇 곳인가요?`,`${updated()} 기준 지자체에 등록된 ${KINDS[k].title}은 ${n(items.length)}곳입니다${subs.length?`(${subs.map(([s,v])=>`${s} ${n(v)}곳`).join(', ')})`:''}.`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 서비스센터',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[KINDS[k].label,`${SITE}/region/${r.id}/${k}`]])}/>
  </div>;
}
