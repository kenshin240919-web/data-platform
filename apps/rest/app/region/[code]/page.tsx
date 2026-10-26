import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {PlaceList} from '../../_components/PlaceList';
import {Ad} from '../../_components/Ad';
import {PriceNote} from '../../_components/Guide';
import {COND_MIN,KIND_ORDER,KINDS,n,ordered,region,regions,shopPath,SITE,slim,updated} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  const parts=KIND_ORDER.filter(k=>r.kinds[k]).map(k=>`${KINDS[k].label} ${n(r.kinds[k])}곳`);
  return {title:`${r.name} 찜질방·목욕탕 ${n(r.kinds.sauna)}곳 · 1인 목욕·세신·피부관리`,description:`${r.name}에 신고된 ${parts.join(', ')}. 위치·전화·영업 햇수를 가까운 순으로.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const old=r.items.filter(p=>p.kind==='sauna'&&p.since).sort((a,b)=>a.since!.localeCompare(b.since!))[0];
  const list=ordered(r.items);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › {r.name}</nav>
    <h1>{r.name} 찜질방·목욕탕·휴식</h1>
    <p className="rs-answer"><b>{r.name}</b>에 영업 중으로 신고된 곳: {KIND_ORDER.filter(k=>r.kinds[k]).map((k,i)=><span key={k}>{i>0&&' · '}{KINDS[k].label} <b>{n(r.kinds[k])}곳</b></span>)}. <span className="muted">({updated()} 기준)</span></p>
    <div className="rs-jump">{KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=><Link key={k} href={`/region/${r.id}/${k}`}>{KINDS[k].icon} {r.zone} {KINDS[k].label} <small>{n(r.kinds[k])}</small></Link>)}</div>
    <section><h2>{r.name} 목록</h2><PlaceList items={list.map(slim)}/>
      <noscript><ul>{list.slice(0,300).map(p=><li key={p.id}><a href={shopPath(p.id)}>{p.name}</a> · {KINDS[p.kind].label}{p.sub?` · ${p.sub}`:''}</li>)}</ul></noscript></section>
    <Ad/>
    <PriceNote/>
    <Faq items={([
      [`${r.name}에 찜질방·목욕탕은 몇 곳인가요?`,`${updated()} 기준 영업 중으로 신고된 찜질방·사우나·목욕탕은 ${n(r.kinds.sauna)}곳입니다.`],
      [`${r.name}에 1인 목욕탕·세신샵이 있나요?`,r.kinds.private?`신고된 1인·프라이빗 목욕·세신샵이 ${n(r.kinds.private)}곳 있습니다: ${r.items.filter(p=>p.kind==='private').slice(0,5).map(p=>p.name).join(', ')}.`:'지자체에 신고된 1인·프라이빗 목욕·세신샵은 아직 없습니다. 가까운 지역 목록을 확인하세요.'],
      [`${r.name}에서 가장 오래된 목욕탕은?`,old?`신고일 기준 ${old.name}(${old.since})입니다.`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect items={linksNear(r.lat,r.lon,'rest')}/>
    <JsonLd data={breadcrumbLd([['내근처 휴식',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
