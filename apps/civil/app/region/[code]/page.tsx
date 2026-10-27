import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {PlaceList} from '../../_components/PlaceList';
import {Ad} from '../../_components/Ad';
import {COND_MIN,KIND_ORDER,KINDS,n,ordered,placePath,region,regions,SITE,slim,updated} from '../../../lib/data';
export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
const unit=(k:string)=>k==='kiosk'?'대':'곳';
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  const parts=KIND_ORDER.filter(k=>r.kinds[k]).map(k=>`${KINDS[k].label} ${n(r.kinds[k])}${unit(k)}`);
  return {title:`${r.name} 무인민원발급기 ${n(r.kinds.kiosk)}대 · 주민센터·우체국`,description:`${r.name}의 ${parts.join(', ')}. 운영 시간과 뗄 수 있는 서류를 가까운 순으로.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const list=ordered(r.items);const wk=r.items.filter(p=>p.kind==='kiosk'&&p.hol);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › {r.name}</nav>
    <h1>{r.name} 민원·서류</h1>
    <p className="cv-answer"><b>{r.name}</b>: {KIND_ORDER.filter(k=>r.kinds[k]).map((k,i)=><span key={k}>{i>0&&' · '}{KINDS[k].label} <b>{n(r.kinds[k])}{unit(k)}</b></span>)}. <span className="muted">({updated()} 기준)</span></p>
    <div className="cv-jump">{KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=><Link key={k} href={`/region/${r.id}/${k}`}>{KINDS[k].icon} {r.zone} {KINDS[k].label} <small>{n(r.kinds[k])}</small></Link>)}</div>
    <section><h2>{r.name} 목록</h2><PlaceList items={list.map(slim)}/>
      <noscript><ul>{list.slice(0,300).map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> · {KINDS[p.kind].label}</li>)}</ul></noscript></section>
    <Ad/>
    <Faq items={([
      [`${r.name}에 무인민원발급기는 몇 대인가요?`,`${updated()} 기준 ${n(r.kinds.kiosk)}대입니다${wk.length?`(주말·공휴일 운영 ${n(wk.length)}대)`:''}.`],
      [`${r.name}에서 주말에 서류를 뗄 수 있는 곳은?`,wk.length?`주말·공휴일 운영 시간이 등록된 발급기는 ${wk.slice(0,5).map(p=>p.name).join(', ')}${wk.length>5?' 등':''}입니다.`:'주말·공휴일 운영 시간이 등록된 발급기가 없습니다. 가까운 지역을 확인하세요.'],
      [`${r.name} 주민센터는 몇 곳인가요?`,r.kinds.office?`${n(r.kinds.office)}곳입니다.`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect items={linksNear(r.lat,r.lon,'civil')}/>
    <JsonLd data={breadcrumbLd([['내근처 서류',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
