import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor,linksForCode} from '@guidejung/ui/network';
import {ItemList} from '../../_components/Cards';
import {Ad} from '../../_components/Ad';
import {allFor,byViews,dueSoon,eun,fieldCount,FIELD_ORDER,FIELDS,localItems,n,nationItems,region,regionFields,regions,SITE,sidoItems,today,won} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.code}));}
type P={params:Promise<{code:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  const local=localItems(r.code),top=[...local].sort(byViews).slice(0,3).map(i=>i.name);
  return {title:`${r.name} 지원금·혜택 ${n(allFor(r).length)}가지 — ${r.zone}만의 혜택 ${n(local.length)}`,
    description:`${r.name}에 살면 받을 수 있는 지원금·혜택: ${r.zone}이 주는 ${n(local.length)}가지${top.length?`(${top.join('·')} 등)`:''}, ${r.sido} ${n(sidoItems(r.sido).length)}가지, 전국 ${n(nationItems.length)}가지. 마감 임박·분야별로.`.slice(0,160),
    alternates:{canonical:`/region/${r.code}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const local=[...localItems(r.code)].sort(byViews),sido=[...sidoItems(r.sido)].sort(byViews),all=allFor(r);
  const soon=dueSoon(all,45).slice(0,10),fc=fieldCount([...local,...sido]),fields=regionFields(r);
  const cash=local.filter(i=>i.amount).sort((a,b)=>b.amount!-a.amount!).slice(0,3);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › {r.name}</nav>
    <h1>{r.name} 지원금·혜택</h1>
    <div className="bf-stats"><div><b>{n(local.length)}</b><small>{r.zone}만의 혜택</small></div><div><b>{n(sido.length)}</b><small>{r.sido} 전체 혜택</small></div><div><b>{n(nationItems.length)}</b><small>전국 공통</small></div><div><b>{n(dueSoon(all,31).length)}</b><small>한 달 안 마감</small></div></div>
    <p className="bf-lead">{eun(r.name)} 주민이 볼 수 있는 혜택은 모두 {n(all.length)}가지예요. 이 가운데 {r.zone}이 따로 주는 것이 {n(local.length)}가지{cash.length?`이고, 지원 내용에 적힌 금액이 큰 것은 ${cash.map(i=>`${i.name}(최대 ${won(i.amount!)})`).join(', ')}이에요`:'예요'}.</p>
    <div className="bf-chips"><a className="bf-chip on" href={`/find?r=${r.code}`}>🎯 {r.zone} 주민, 나에게 맞는 것만</a></div>
    {fields.length>0&&<section><h2>분야로 보기</h2><div className="bf-cats">{FIELD_ORDER.filter(f=>fc[f]>0).map(f=>fields.includes(f)
      ?<Link key={f} href={`/region/${r.code}/${f}`}><span aria-hidden="true">{FIELDS[f].icon}</span><span><b>{FIELDS[f].label}</b><small>{n(fc[f])}가지</small></span></Link>
      :<a key={f} href={`#f-${f}`}><span aria-hidden="true">{FIELDS[f].icon}</span><span><b>{FIELDS[f].label}</b><small>{n(fc[f])}가지</small></span></a>)}</div></section>}
    {soon.length>0&&<section><h2>📅 곧 마감 — {r.name} 주민이 신청할 수 있는 것</h2><ItemList list={soon} today={today}/></section>}
    <section><h2>🏘️ {r.zone}만의 혜택 <span className="muted">{n(local.length)}가지 · 많이 찾는 순</span></h2>
      {local.length?<>{FIELD_ORDER.filter(f=>local.some(i=>i.field===f)).map(f=><div key={f} id={`f-${f}`}><h3 className="bf-group-title">{FIELDS[f].icon} {FIELDS[f].label} <small className="muted">{n(local.filter(i=>i.field===f).length)}</small></h3>
        <ItemList list={local.filter(i=>i.field===f)} today={today} hideScope/></div>)}</>:<p className="muted">정부24에 등록된 {r.zone} 혜택이 아직 없어요.</p>}</section>
    <Ad/>
    <section><h2>🏙️ {r.sido} 전체 혜택 <span className="muted">많이 찾는 {Math.min(20,sido.length)}가지</span></h2><ItemList list={sido.slice(0,20)} today={today}/></section>
    <section><h2>🇰🇷 전국 공통, 많이 찾는 혜택</h2><ItemList list={[...nationItems].sort(byViews).slice(0,10)} today={today}/></section>
    <Faq title={`${r.name} 지원금 자주 묻는 질문`} items={([
      [`${r.name}에서 받을 수 있는 지원금은 몇 가지인가요?`,`정부24 공공서비스 정보 기준 ${r.zone}이 주는 혜택 ${n(local.length)}가지, ${r.sido} 전체 혜택 ${n(sido.length)}가지, 전국 공통 ${n(nationItems.length)}가지예요.`],
      [`${r.name}에서 많이 찾는 혜택은?`,local.length?local.slice(0,5).map(i=>i.name).join(', ')+' 등이에요.':''],
      [`${r.name} 혜택 중 곧 마감되는 것은?`,soon.length?soon.slice(0,3).map(i=>`${i.name}(${+i.due!.slice(5,7)}월 ${+i.due!.slice(8,10)}일까지)`).join(', ')+'이 있어요.':'한 달 안에 마감되는 것으로 등록된 혜택은 없어요. 상시 신청인 혜택이 많아요.'],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect items={linksForCode(r.code,'benefit').length?linksForCode(r.code,'benefit'):genericFor('benefit')}/>
    <JsonLd data={breadcrumbLd([['내근처 혜택',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.code}`]])}/>
  </div>;
}
