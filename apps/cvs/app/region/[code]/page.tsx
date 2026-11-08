import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {StoreList} from '../../_components/StoreList';
import {Ad} from '../../_components/Ad';
import {NightSteps} from '../../_components/Guide';
import {BRAND_ORDER,BRANDS,COND_MIN,meters,n,ordered,region,regions,SITE,slim,storePath,updated} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
const parts=(r:NonNullable<ReturnType<typeof region>>)=>BRAND_ORDER.filter(k=>r.brands[k]).map(k=>`${BRANDS[k].label} ${n(r.brands[k])}`);
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  return {title:`${r.name} 상비약 파는 편의점 ${n(r.count)}곳`,description:`${r.name}에서 안전상비의약품 판매자로 등록된 편의점·마트 ${n(r.count)}곳(${parts(r).join(', ')}). 약국이 닫은 밤에 가까운 곳과 가장 가까운 약국을 확인하세요.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const list=ordered(r.items);
  const far=r.items.filter(p=>p.ph&&p.ph.m>=1000).sort((a,b)=>b.ph!.m-a.ph!.m).slice(0,5);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › {r.name}</nav>
    <h1>{r.name} 상비약 파는 편의점</h1>
    <p className="cv-answer"><b>{r.name}</b>에서 안전상비의약품 판매자로 등록된 곳 <b>{n(r.count)}곳</b>: {parts(r).join(' · ')}. <span className="muted">({updated()} 기준)</span></p>
    {(r.ph_mid!=null||r.no_ph>0)&&<p className="cv-ph">💊 이 지역 상비약 편의점에서 가장 가까운 약국까지 거리는 보통(중앙값) <b>{r.ph_mid!=null?meters(r.ph_mid):'-'}</b>{r.no_ph>0&&<>, 1km 안에 약국이 없는 곳이 <b>{n(r.no_ph)}곳</b></>}이에요.</p>}
    <div className="cv-jump">{BRAND_ORDER.filter(k=>k!=='other'&&r.brands[k]>=COND_MIN).map(k=><Link key={k} href={`/region/${r.id}/${k}`}>{r.zone} {BRANDS[k].label} <small>{n(r.brands[k])}</small></Link>)}</div>
    <section><h2>{r.name} 목록</h2><StoreList items={list.map(slim)}/>
      <noscript><ul>{list.slice(0,300).map(p=><li key={p.id}><a href={storePath(p.id)}>{p.name}</a> · {BRANDS[p.brand].label}</li>)}</ul></noscript></section>
    <Ad/>
    <NightSteps/>
    <Faq items={([
      [`${r.name}에 상비약 파는 편의점은 몇 곳인가요?`,`${updated()} 기준 안전상비의약품 판매자로 등록된 편의점·마트는 ${n(r.count)}곳입니다(${parts(r).join(', ')}).`],
      [`${r.name}에서 약국이 먼 편의점은?`,far.length?`가장 가까운 약국까지 1km가 넘는 곳: ${far.map(p=>`${p.name}(${meters(p.ph!.m)})`).join(', ')}.`:''],
      [`${r.name} 편의점 상비약은 밤에도 살 수 있나요?`,'판매자로 등록하려면 24시간 연중 무휴 점포를 갖춰야 합니다(약사법 제44조의2). 실제 영업 시간은 매장에 확인하세요.'],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect items={linksNear(r.lat,r.lon,'cvs')}/>
    <JsonLd data={breadcrumbLd([['내근처 편의점',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
