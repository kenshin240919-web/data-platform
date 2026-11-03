import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {PlaceList} from '../../_components/PlaceList';
import {Ad} from '../../_components/Ad';
import {Official} from '../../_components/Guide';
import {HomeLinks} from '../../_components/HomeLinks';
import {centerFor,COND_MIN,KIND_ORDER,KINDS,n,ordered,placePath,region,regions,SITE,slim,updated} from '../../../lib/data';
export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  const c=centerFor(r);
  const parts=KIND_ORDER.filter(k=>r.kinds[k]&&k!=='center').map(k=>`${KINDS[k].label} ${n(r.kinds[k])}곳`);
  return {title:`${r.name} 관할 고용센터·직업소개소 ${n(r.kinds.agency+r.kinds.free)}곳`,description:`${r.name} ${c.exact?'관할':'가까운'} 고용센터는 ${c.list.map(x=>x.name).join(', ')}. ${parts.join(', ')}. 주소·전화를 가까운 순으로.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const list=ordered(r.items.filter(p=>p.kind!=='center'));const c=centerFor(r);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › {r.name}</nav>
    <h1>{r.name} 일자리 기관</h1>
    {c.list.map(x=><a key={x.id} className="jb-juris" href={placePath(x.id)}><span aria-hidden="true">🏛️</span><span><small>{r.name} {c.exact?'관할 고용센터':'에서 가까운 고용센터(관할은 센터에 확인)'}</small><b>{x.name}</b><small>{x.addr}{x.tel?` · ${x.tel}`:''}</small></span><em>실업급여·구직 신청 →</em></a>)}
    <HomeLinks center={c.list[0]} region={r.id}/>
    <p className="jb-answer"><b>{r.name}</b>: {KIND_ORDER.filter(k=>r.kinds[k]&&k!=='center').map((k,i)=><span key={k}>{i>0&&' · '}{KINDS[k].label} <b>{n(r.kinds[k])}곳</b></span>)}. <span className="muted">({updated()} 기준)</span></p>
    <div className="jb-jump">{KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=><Link key={k} href={`/region/${r.id}/${k}`}>{KINDS[k].icon} {r.zone} {KINDS[k].label} <small>{n(r.kinds[k])}</small></Link>)}</div>
    <section><h2>{r.name} 목록</h2>{list.length?<PlaceList items={list.map(slim)}/>:<p className="muted">이 지역에 등록된 기관이 없어요. 가까운 지역을 확인하세요.</p>}
      <noscript><ul>{list.slice(0,300).map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> · {KINDS[p.kind].label}</li>)}</ul></noscript></section>
    <Ad/>
    <Official/>
    <Faq items={([
      [`${r.name} 실업급여는 어디서 신청하나요?`,c.list.length?`${c.exact?'관할':'가까운'} 고용센터는 ${c.list.map(x=>`${x.name}(${x.addr??''})`).join(', ')}입니다.${c.exact?'':' 관할은 센터에 확인하세요.'}`:''],
      [`${r.name}에 직업소개소는 몇 곳인가요?`,`${updated()} 기준 유료 ${n(r.kinds.agency)}곳, 무료 ${n(r.kinds.free)}곳입니다.`],
      [`${r.name} 자격증 시험장은 어디인가요?`,r.kinds.exam?`국가자격 시험장 ${n(r.kinds.exam)}곳: ${r.items.filter(p=>p.kind==='exam').slice(0,5).map(p=>p.name).join(', ')}${r.kinds.exam>5?' 등':''}입니다. 내 시험장은 큐넷 수험표에서 확인하세요.`:''],
      [`${r.name}에 새일센터가 있나요?`,r.kinds.women?`${r.items.filter(p=>p.kind==='women').map(p=>p.name).join(', ')}가 있습니다.`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect items={linksNear(r.lat,r.lon,'job')}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
