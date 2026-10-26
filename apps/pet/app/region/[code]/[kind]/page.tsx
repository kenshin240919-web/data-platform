import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {PlaceList} from '../../../_components/PlaceList';
import {Ad} from '../../../_components/Ad';
import {HoursNote} from '../../../_components/Guide';
import {COND_MIN,eun,is24,KIND_ORDER,KINDS,n,ordered,region,regions,placePath,SITE,slim,subsOf,updated,type Kind} from '../../../../lib/data';

// 시군구 × 종류 페이지: COND_MIN곳 이상인 곳만 만듦.
export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>({code:r.id,kind:k})));}
type P={params:Promise<{code:string;kind:string}>};
const get=async(params:P['params'])=>{const {code,kind}=await params;const r=region(code);const k=kind as Kind;return r&&KINDS[k]?{r,k,items:ordered(r.items.filter(p=>p.kind===k))}:null;};
const TITLE:Record<Kind,string>={hospital:'동물병원',pharmacy:'동물약국',hotel:'펫호텔·애견 유치원',cafe:'애견·고양이 카페',taxi:'펫택시'};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const x=await get(params);if(!x)return {};
  const h=x.items.filter(is24).length;
  return {title:`${x.r.name} ${TITLE[x.k]} ${n(x.items.length)}곳${x.k==='hospital'&&h?` · 24시 ${h}곳`:''}`,description:`${x.r.name} ${TITLE[x.k]} ${n(x.items.length)}곳: ${x.items.slice(0,5).map(p=>p.name).join(', ')}${x.items.length>5?' 등':''}. 위치·전화를 확인하세요.${x.k==='pharmacy'?' 지금 문 연 곳부터 보여 드려요.':''}`,alternates:{canonical:`/region/${x.r.id}/${x.k}`}};
}
export default async function KindPage({params}:P){
  const x=await get(params);if(!x||x.items.length<COND_MIN)notFound();
  const {r,k,items}=x;const subs=subsOf(items);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {KINDS[k].label}</nav>
    <h1>{r.name} {TITLE[k]}</h1>
    <p className="pt-answer"><b>{r.name}</b>에 영업 중으로 신고된 {eun(KINDS[k].title)} <b>{n(items.length)}곳</b>이에요{subs.length>1?` (${subs.map(([s,v])=>`${s} ${n(v)}`).join(' · ')})`:''}. <span className="muted">({updated()} 기준)</span></p>
    <div className="pt-jump">{KIND_ORDER.filter(o=>o!==k&&r.kinds[o]>=COND_MIN).map(o=><Link key={o} href={`/region/${r.id}/${o}`}>{KINDS[o].icon} {r.zone} {KINDS[o].label} <small>{n(r.kinds[o])}</small></Link>)}<Link href={`/region/${r.id}`}>{r.zone} 전체 <small>{n(r.count)}</small></Link></div>
    <section><h2>{r.name} {KINDS[k].label} 목록</h2><PlaceList items={items.map(slim)} kind={k}/>
      <noscript><ul>{items.slice(0,300).map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a>{p.sub?` · ${p.sub}`:''}</li>)}</ul></noscript></section>
    <Ad/>
    {(k==='hospital'||k==='pharmacy')&&<HoursNote/>}
    <Faq items={[[`${r.name} ${eun(KINDS[k].title)} 몇 곳인가요?`,`${updated()} 기준 지자체에 영업 중으로 신고된 ${eun(KINDS[k].title)} ${n(items.length)}곳입니다${subs.length>1?`(${subs.map(([s,v])=>`${s} ${n(v)}곳`).join(', ')})`:''}.`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 동물병원',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[KINDS[k].label,`${SITE}/region/${r.id}/${k}`]])}/>
  </div>;
}
