import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearCivil} from '../../_components/NearCivil';
import {PrintNear} from '../../_components/PrintNear';
import {Ad} from '../../_components/Ad';
import {doc,docs,eun,n,places,regions,SITE,updated} from '../../../lib/data';
export const dynamicParams=false;
// 서류 목록을 아직 못 받은 날(첫 수집·하루 한도)에도 빌드가 되도록 그때는 첫 서류 하나만 '준비 중'(noindex)으로 만든다.
export function generateStaticParams(){const ok=docs.filter(d=>d.count);return (ok.length?ok:docs.slice(0,1)).map(d=>({slug:d.slug}));}
type P={params:Promise<{slug:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{const d=doc((await params).slug);if(!d)return {};
  if(!d.count)return {title:`${d.title} 떼는 곳`,robots:{index:false,follow:true}};
  return {title:`${d.title} 떼는 곳 · 내 주변 무인민원발급기 ${n(d.count)}대`,description:`${d.title}를 뗄 수 있는 무인민원발급기 전국 ${n(d.count)}대를 가까운 순으로. ${d.tip}`,alternates:{canonical:`/doc/${d.slug}`}};}
export default async function DocPage({params}:P){
  const d=doc((await params).slug);if(!d)notFound();
  if(!d.count)return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › {d.title}</nav><h1>🧾 {d.title} 떼는 곳</h1><p className="cv-answer">발급기별 서류 정보를 받고 있어요. 그동안 내 주변 무인민원발급기·주민센터를 먼저 보여 드려요.</p><NearCivil/></div>;
  const ids=new Set(d.ids);const ks=places.filter(p=>p.kind==='kiosk'&&p.docs?.some(i=>ids.has(i)));
  const top=regions.map(r=>({r,c:ks.filter(k=>k.region===r.id).length})).filter(x=>x.c).sort((a,b)=>b.c-a.c).slice(0,10);
  const weekend=ks.filter(k=>k.hol).length;
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/doc">서류별</Link> › {d.title}</nav>
    <h1>🧾 {d.title} 떼는 곳</h1>
    <p className="cv-answer">{eun(d.title)} 전국 무인민원발급기 <b>{n(d.count)}대</b>에서 뗄 수 있어요(주말·공휴일 운영 {n(weekend)}대). {d.tip} <span className="muted">({updated()} 기준)</span></p>
    <NearCivil doc={d.slug} docTitle={d.title}/>
    <Ad/>
    <PrintNear compact/>
    <section><h2>{d.title} 발급기 많은 지역</h2><ol className="cv-rank">{top.map(({r,c})=><li key={r.id}><Link href={`/region/${r.id}/kiosk`}><b>{r.name}</b><span>{n(c)}대</span></Link></li>)}</ol></section>
    {d.names.length>1&&<section><h2>이 이름으로 나오는 서류</h2><ul className="cv-plain">{d.names.slice(0,20).map(x=><li key={x}>{x}</li>)}</ul></section>}
    <Faq items={[[`${d.title}는 어디서 떼나요?`,`무인민원발급기 전국 ${n(d.count)}대에서 뗄 수 있습니다. ${d.tip}`],[`주말에도 ${d.title}를 뗄 수 있나요?`,weekend?`주말·공휴일 운영 시간이 등록된 발급기 ${n(weekend)}대에서 뗄 수 있습니다.`:'주말·공휴일에 운영하는 발급기는 등록돼 있지 않습니다.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 서류',SITE+'/'],['서류별',SITE+'/doc'],[d.title,`${SITE}/doc/${d.slug}`]])}/>
  </div>;
}
