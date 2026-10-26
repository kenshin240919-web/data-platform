import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {PlaceList} from '../../../_components/PlaceList';
import {Ad} from '../../../_components/Ad';
import {PriceNote} from '../../../_components/Guide';
import {COND_MIN,eun,KIND_ORDER,KINDS,n,ordered,region,regions,shopPath,SITE,slim,subsOf,updated,type Kind} from '../../../../lib/data';

// 시군구 × 종류 페이지: COND_MIN곳 이상인 곳만 만듦. '마사지'라는 말은 안마원 페이지에만(설계안 10/25 결정).
export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>({code:r.id,kind:k})));}
type P={params:Promise<{code:string;kind:string}>};
const get=async(params:P['params'])=>{const {code,kind}=await params;const r=region(code);const k=kind as Kind;return r&&KINDS[k]?{r,k,items:ordered(r.items.filter(p=>p.kind===k))}:null;};
const TITLE:Record<Kind,string>={sauna:'찜질방·사우나·목욕탕',private:'1인 목욕탕·세신샵',anma:'안마원·안마시술소(마사지)',skin:'피부관리실'};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const x=await get(params);if(!x)return {};
  return {title:`${x.r.name} ${TITLE[x.k]} ${n(x.items.length)}곳`,description:`${x.r.name} ${TITLE[x.k]} ${n(x.items.length)}곳: ${x.items.slice(0,5).map(p=>p.name).join(', ')}${x.items.length>5?' 등':''}. 위치·전화·영업 햇수를 확인하세요.${x.k==='anma'?' 시각장애인 안마사가 개설해 신고한 곳입니다.':''}`,alternates:{canonical:`/region/${x.r.id}/${x.k}`}};
}
export default async function KindPage({params}:P){
  const x=await get(params);if(!x||x.items.length<COND_MIN)notFound();
  const {r,k,items}=x;const subs=subsOf(items);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {KINDS[k].label}</nav>
    <h1>{r.name} {TITLE[k]}</h1>
    <p className="rs-answer"><b>{r.name}</b>에 영업 중으로 신고된 {eun(KINDS[k].title)} <b>{n(items.length)}곳</b>이에요{subs.length>1?` (${subs.map(([s,v])=>`${s} ${n(v)}`).join(' · ')})`:''}. <span className="muted">({updated()} 기준)</span></p>
    <div className="rs-jump">{KIND_ORDER.filter(o=>o!==k&&r.kinds[o]>=COND_MIN).map(o=><Link key={o} href={`/region/${r.id}/${o}`}>{KINDS[o].icon} {r.zone} {KINDS[o].label} <small>{n(r.kinds[o])}</small></Link>)}<Link href={`/region/${r.id}`}>{r.zone} 전체 <small>{n(r.count)}</small></Link></div>
    <section><h2>{r.name} {KINDS[k].label} 목록</h2><PlaceList items={items.map(slim)} kind={k}/>
      <noscript><ul>{items.slice(0,300).map(p=><li key={p.id}><a href={shopPath(p.id)}>{p.name}</a>{p.sub?` · ${p.sub}`:''}</li>)}</ul></noscript></section>
    <Ad/>
    <PriceNote/>
    <Faq items={[[`${r.name} ${eun(KINDS[k].title)} 몇 곳인가요?`,`${updated()} 기준 지자체에 영업 중으로 신고된 ${eun(KINDS[k].title)} ${n(items.length)}곳입니다${subs.length>1?`(${subs.map(([s,v])=>`${s} ${n(v)}곳`).join(', ')})`:''}.`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 휴식',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[KINDS[k].label,`${SITE}/region/${r.id}/${k}`]])}/>
  </div>;
}
