import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearCivil} from '../_components/NearCivil';
import {Ad} from '../_components/Ad';
import {HowTo} from '../_components/Guide';
import {eun,ga,COND_MIN,KIND_ORDER,KINDS,n,nation,places,placePath,regions,sidos,SITE,updated,weekendKiosks,type Kind} from '../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return KIND_ORDER.map(kind=>({kind}));}
type P={params:Promise<{kind:string}>};
const META:Record<Kind,[string,string]>={
  kiosk:['내 주변 무인민원발급기','지금 운영 중인 무인민원발급기를 가까운 순으로. 평일·주말 운영 시간, 뗄 수 있는 서류, 장애인 편의 기능까지.'],
  office:['내 주변 주민센터·행정복지센터','가까운 동 주민센터·행정복지센터·읍면사무소 위치. 발급기에서 안 되는 서류는 주민센터로.'],
  cso:['시·구청 민원실 실시간 대기 인원','지금 기다리는 사람 수를 알려 주는 시·구청 민원실. 업무별 대기 인원을 보고 덜 붐빌 때 가세요.'],
  passport:['내 주변 여권 발급 기관','여권을 신청·수령하는 시·군·구청 여권민원실 위치와 업무 시간, 야간 연장 운영.'],
  post:['내 주변 우체국','가까운 우체국 위치와 우편·금융 업무 시간. 뗀 서류를 등기로 부칠 때.'],
};
const unit=(k:Kind)=>k==='kiosk'?'대':'곳';
export async function generateMetadata({params}:P):Promise<Metadata>{
  const k=(await params).kind as Kind;if(!KINDS[k])return {};
  return {title:`${META[k][0]} ${n(nation.kinds[k])}${unit(k)}`,description:`${META[k][1]} (${updated()} 기준 ${n(nation.kinds[k])}${unit(k)})`,alternates:{canonical:`/${k}`}};
}
export default async function KindHome({params}:P){
  const k=(await params).kind as Kind;if(!KINDS[k])notFound();
  const items=places.filter(p=>p.kind===k);
  const top=[...regions].filter(r=>r.kinds[k]>=COND_MIN).sort((a,b)=>b.kinds[k]-a.kinds[k]).slice(0,12);
  const all=k==='cso'||k==='passport'?sidos.map(s=>({name:s.name,items:items.filter(p=>s.regions.some(r=>r.id===p.region))})).filter(s=>s.items.length):[];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › {KINDS[k].label}</nav>
    <h1>{KINDS[k].icon} {META[k][0]}</h1>
    <p className="cv-answer">전국 {eun(KINDS[k].title)} <b>{n(items.length)}{unit(k)}</b>이에요{k==='kiosk'?` (주말·공휴일 운영 ${n(weekendKiosks.length)}대)`:''}. <span className="muted">({updated()} 기준)</span></p>
    <NearCivil kind={k}/>
    <div className="cv-jump">{KIND_ORDER.filter(o=>o!==k).map(o=><Link key={o} href={`/${o}`}>{KINDS[o].icon} {KINDS[o].label} <small>{n(nation.kinds[o])}</small></Link>)}</div>
    <Ad/>
    {top.length>0&&<section><h2>{KINDS[k].label} 많은 지역</h2><ol className="cv-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/${k}`}><b>{r.name}</b><span>{n(r.kinds[k])}{unit(k)}</span></Link></li>)}</ol></section>}
    {all.map(s=><section key={s.name}><h2>{s.name} <span className="muted">{n(s.items.length)}곳</span></h2><ul className="cv-plain">{s.items.map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> <span className="muted">· {p.region_name}{p.hours?` · ${p.hours}`:''}{p.night?' · 야간 운영':''}</span></li>)}</ul></section>)}
    <HowTo/>
    <Faq items={[[`${eun(KINDS[k].title)} 몇 ${k==='kiosk'?'대':'곳'}인가요?`,`${updated()} 기준 전국 ${n(items.length)}${unit(k)}입니다.`],
      ...(top[0]?[[`${ga(KINDS[k].label)} 가장 많은 지역은?`,`${top.slice(0,3).map(r=>`${r.name} ${n(r.kinds[k])}${unit(k)}`).join(', ')} 순입니다.`] as [string,string]]:[])]}/>
    <JsonLd data={breadcrumbLd([['내근처 서류',SITE+'/'],[KINDS[k].label,`${SITE}/${k}`]])}/>
  </div>;
}
