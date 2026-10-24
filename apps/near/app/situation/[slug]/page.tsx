import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AREAS} from '@guidejung/ui/network';
import {AdSlot} from '@guidejung/ui/ads';
import {Actions} from '@guidejung/ui/favlist';
import {Faq,JsonLd,breadcrumbLd} from '@guidejung/ui/seo';
import {SituationLive} from '../../_components/SituationLive';
import {SITUATIONS,situation} from '../../../lib/situations';
import {SITE} from '../../../lib/site';

export function generateStaticParams(){return SITUATIONS.map(s=>({slug:s.slug}));}
type P={params:Promise<{slug:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const s=situation((await params).slug);if(!s)return {};
  return {title:`${s.title} — ${s.h1}`,description:s.desc,alternates:{canonical:`/situation/${s.slug}`},openGraph:{title:`${s.h1} | 내근처`,description:s.desc,url:`${SITE}/situation/${s.slug}`}};
}
export default async function Page({params}:P){
  const s=situation((await params).slug);if(!s)notFound();
  const others=SITUATIONS.filter(x=>x.slug!==s.slug);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › {s.title}</nav>
    <section className="nr-hero small"><h1>{s.icon} {s.h1}</h1><p>{s.lead}</p></section>
    <Actions/>
    <SituationLive kind={s.slug} areas={AREAS}/>
    <section><h2>지금 할 일, 순서대로</h2><ol className="nr-steps">{s.steps.map(([h,t])=><li key={h}><b>{h}</b><p>{t}</p></li>)}</ol>
      {s.notes.map(t=><p key={t} className="muted small">※ {t}</p>)}</section>
    <AdSlot/>
    <section><h2>더 자세히 보기</h2><div className="nr-sites">{s.links.map(([i,t,h])=><a key={h} href={h} className="nr-site"><span aria-hidden="true">{i}</span><span><b>{t}</b><small>{h.replace('https://','')}</small></span></a>)}</div></section>
    <Faq items={s.faq} title={`${s.title} 자주 묻는 질문`}/>
    <section><h2>다른 상황</h2><div className="nr-situations">{others.map(o=><Link key={o.slug} href={`/situation/${o.slug}`} className="nr-situation"><span aria-hidden="true">{o.icon}</span><b>{o.title}</b><small>{o.lead}</small></Link>)}</div></section>
    <JsonLd data={breadcrumbLd([['내근처',`${SITE}/`],[s.title,`${SITE}/situation/${s.slug}`]])}/>
    <JsonLd data={{'@context':'https://schema.org','@type':'HowTo',name:s.h1,description:s.desc,step:s.steps.map(([h,t],i)=>({'@type':'HowToStep',position:i+1,name:h,text:t}))}}/>
  </div>;
}
