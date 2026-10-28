import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {ItemList} from '../../_components/Cards';
import {Ad} from '../../_components/Ad';
import {byViews,dueSoon,FIELD_ORDER,FIELDS,items,n,nationItems,regionFields,regions,SITE,today,type Field} from '../../../lib/data';
export const dynamicParams=false;
export function generateStaticParams(){return FIELD_ORDER.map(f=>({field:f}));}
type P={params:Promise<{field:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{const f=(await params).field as Field;if(!FIELDS[f])return {};
  const all=items.filter(i=>i.field===f);
  return {title:`${FIELDS[f].label} 지원금·혜택 ${n(all.length)}가지 — 전국·우리 동네`,description:`${FIELDS[f].label}(${FIELDS[f].q}) 분야 정부·지자체 혜택 ${n(all.length)}가지. 많이 찾는 순, 곧 마감, 시군구별로.`,alternates:{canonical:`/topic/${f}`}};}
export default async function Topic({params}:P){
  const f=(await params).field as Field;if(!FIELDS[f])notFound();
  const all=items.filter(i=>i.field===f),nation=nationItems.filter(i=>i.field===f).sort(byViews),soon=dueSoon(all,60).slice(0,10);
  const local=all.filter(i=>i.scope!=='nation').sort(byViews);
  const withPage=regions.filter(r=>regionFields(r).includes(f));
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/topic">분야별</Link> › {FIELDS[f].label}</nav>
    <h1>{FIELDS[f].icon} {FIELDS[f].label} 혜택</h1>
    <p className="bf-lead">{FIELDS[f].label} 분야 혜택은 모두 {n(all.length)}가지예요. 전국 공통 {n(nation.length)}가지, 시도·시군구가 주는 것 {n(local.length)}가지예요.</p>
    {soon.length>0&&<section><h2>📅 곧 마감</h2><ItemList list={soon} today={today}/></section>}
    <section><h2>🇰🇷 전국 공통 <span className="muted">많이 찾는 순</span></h2><ItemList list={nation.slice(0,60)} today={today}/></section>
    <Ad/>
    <section><h2>🏘️ 시도·시군구 혜택 <span className="muted">많이 찾는 40가지</span></h2><ItemList list={local.slice(0,40)} today={today}/></section>
    {withPage.length>0&&<section><h2>우리 동네 {FIELDS[f].label} 혜택</h2><div className="bf-regions">{withPage.map(r=><Link key={r.code} href={`/region/${r.code}/${f}`}>{r.name}</Link>)}</div></section>}
    <Faq title={`${FIELDS[f].label} 혜택 자주 묻는 질문`} items={[[`${FIELDS[f].label} 혜택은 몇 가지인가요?`,`정부24 공공서비스 정보 기준 ${n(all.length)}가지예요. 많이 찾는 것은 ${nation.slice(0,4).map(i=>i.name).join(', ')} 등이에요.`]]}/>
    <Connect items={genericFor('benefit')}/>
    <JsonLd data={breadcrumbLd([['내근처 혜택',SITE+'/'],['분야별',SITE+'/topic'],[FIELDS[f].label,`${SITE}/topic/${f}`]])}/>
  </div>;
}
