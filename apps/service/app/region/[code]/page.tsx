import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {CenterList} from '../../_components/CenterList';
import {centerPath,COND_MIN,KIND_ORDER,KINDS,n,region,regions,SITE,slim,updated} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  return {title:`${r.name} 자동차 정비소 ${n(r.kinds.repair)}곳 · 검사소·세차장`,description:`${r.name} 자동차 정비소 ${n(r.kinds.repair)}곳(${Object.entries(r.subs).map(([k,v])=>`${k} ${n(v)}`).join(', ')}), 검사소 ${n(r.kinds.inspect)}곳, 세차장 ${n(r.kinds.wash)}곳, 배출가스 정비 ${n(r.kinds.emission)}곳.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const old=[...r.items].filter(p=>p.kind==='repair'&&p.since).sort((a,b)=>a.since!.localeCompare(b.since!))[0];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › {r.name}</nav>
    <h1>{r.name} 자동차 정비소·검사소</h1>
    <p className="sv-answer"><b>{r.name}</b>에 등록된 자동차 정비소는 <b>{n(r.kinds.repair)}곳</b>이에요{Object.keys(r.subs).length?` (${Object.entries(r.subs).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${n(v)}`).join(' · ')})`:''}. 검사소 {n(r.kinds.inspect)}곳 · 세차장 {n(r.kinds.wash)}곳 · 배출가스 정비 {n(r.kinds.emission)}곳. <span className="muted">({updated()} 기준)</span></p>
    <div className="sv-jump">{KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=><Link key={k} href={`/region/${r.id}/${k}`}>{KINDS[k].icon} {r.zone} {KINDS[k].label} <small>{n(r.kinds[k])}</small></Link>)}</div>
    <section><h2>{r.name} 목록</h2><CenterList items={r.items.map(slim)}/>
      <noscript><ul>{r.items.slice(0,300).map(p=><li key={p.id}><a href={centerPath(p.id)}>{p.name}</a> · {KINDS[p.kind].label}{p.sub?` · ${p.sub}`:''}</li>)}</ul></noscript></section>
    <AdSlot/>
    <Faq items={([
      [`${r.name}에 자동차 정비소는 몇 곳인가요?`,`${updated()} 기준 영업 중으로 등록된 정비업체는 ${n(r.kinds.repair)}곳입니다.`],
      [`${r.name}에서 자동차 검사는 어디서 받나요?`,r.kinds.inspect?`지자체에 등록된 검사소가 ${n(r.kinds.inspect)}곳 있습니다. 목록의 ‘검사소’를 눌러 보세요.`:'지자체에 등록된 검사소가 없습니다. 한국교통안전공단 누리집의 검사소 찾기를 이용하거나 가까운 지역 검사소를 확인하세요.'],
      [`${r.name}에서 가장 오래된 정비소는?`,old?`등록일 기준 ${old.name}(${old.since})입니다.`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect items={linksNear(r.lat,r.lon,'service')}/>
    <JsonLd data={breadcrumbLd([['내근처 서비스센터',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
