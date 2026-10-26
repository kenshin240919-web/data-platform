import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {PlaceList} from '../../_components/PlaceList';
import {Ad} from '../../_components/Ad';
import {HoursNote} from '../../_components/Guide';
import {COND_MIN,is24,KIND_ORDER,KINDS,n,ordered,region,regions,placePath,SITE,slim,updated} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  const parts=KIND_ORDER.filter(k=>r.kinds[k]).map(k=>`${KINDS[k].label} ${n(r.kinds[k])}곳`);
  return {title:`${r.name} 동물병원 ${n(r.kinds.hospital)}곳${r.h24?` · 24시 ${r.h24}곳`:''} · 동물약국`,description:`${r.name}에 신고된 ${parts.join(', ')}${r.h24?`, 24시 동물병원 ${r.h24}곳(이름 기준)`:''}. 위치·전화를 가까운 순으로.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const list=ordered(r.items),h24=r.items.filter(is24),ph=r.items.filter(p=>p.kind==='pharmacy');
  const old=r.items.filter(p=>p.kind==='hospital'&&p.since).sort((a,b)=>a.since!.localeCompare(b.since!))[0];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › {r.name}</nav>
    <h1>{r.name} 동물병원·동물약국</h1>
    <p className="pt-answer"><b>{r.name}</b>에 영업 중으로 신고된 곳: {KIND_ORDER.filter(k=>r.kinds[k]).map((k,i)=><span key={k}>{i>0&&' · '}{KINDS[k].label} <b>{n(r.kinds[k])}곳</b></span>)}{h24.length>0&&<> · 24시 동물병원 <b>{n(h24.length)}곳</b>(이름 기준)</>}. <span className="muted">({updated()} 기준)</span></p>
    <div className="pt-jump">{KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=><Link key={k} href={`/region/${r.id}/${k}`}>{KINDS[k].icon} {r.zone} {KINDS[k].label} <small>{n(r.kinds[k])}</small></Link>)}</div>
    <section><h2>{r.name} 목록</h2><PlaceList items={list.map(slim)}/>
      <noscript><ul>{list.slice(0,300).map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> · {KINDS[p.kind].label}{p.sub?` · ${p.sub}`:''}</li>)}</ul></noscript></section>
    <Ad/>
    <HoursNote/>
    <Faq items={([
      [`${r.name}에 동물병원은 몇 곳인가요?`,`${updated()} 기준 영업 중으로 신고된 동물병원은 ${n(r.kinds.hospital)}곳입니다.`],
      [`${r.name}에 24시 동물병원이 있나요?`,h24.length?`이름에 ‘24’가 든 동물병원이 ${n(h24.length)}곳 있습니다: ${h24.slice(0,5).map(p=>p.name).join(', ')}. 가기 전에 전화로 진료 여부를 확인하세요.`:'이름에 ‘24’가 든 동물병원은 없습니다. 가까운 지역의 24시 동물병원을 확인하세요.'],
      [`${r.name} 동물약국은 몇 곳인가요?`,ph.length?`동물용 의약품 판매를 신고한 약국은 ${n(ph.length)}곳이고, 그중 ${n(ph.filter(p=>p.hours).length)}곳은 영업 시간을 보여 드립니다.`:''],
      [`${r.name}에서 가장 오래된 동물병원은?`,old?`개설 신고일 기준 ${old.name}(${old.since})입니다.`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect items={linksNear(r.lat,r.lon,'pet')}/>
    <JsonLd data={breadcrumbLd([['내근처 동물병원',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
