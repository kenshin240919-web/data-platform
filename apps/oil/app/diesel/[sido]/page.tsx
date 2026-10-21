import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {StationList} from '../../_components/StationList';
import {diesel,eun,nation,SITE,sidoByCode,sidos,slim,updated,won} from '../../../lib/data';
export const dynamicParams=false;
export function generateStaticParams(){return sidos.filter(s=>diesel(s.code).length).map(s=>({sido:s.code}));}
type P={params:Promise<{sido:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{const s=sidoByCode((await params).sido);if(!s)return {};const f=diesel(s.code)[0];
  return {title:`${s.name} 경유 최저가 ${won(f?.prices.D047)} · 경유 싼 주유소`,description:`${updated()} ${s.name} 경유 가장 싼 주유소는 ${f?.name} ${won(f?.prices.D047)}. ${s.name} 평균 경유 ${won(s.D047?.price)}. 싼 순 ${diesel(s.code).length}곳.`,alternates:{canonical:`/diesel/${s.code}`}};}
export default async function DieselSido({params}:P){
  const s=sidoByCode((await params).sido);if(!s)notFound();const items=diesel(s.code);if(!items.length)notFound();
  const a=s.D047?.price??null,na=nation.D047?.price??null,f=items[0];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/diesel">경유 최저가</Link> › {s.name}</nav>
    <h1>{s.name} 경유 최저가 주유소</h1>
    <p className="oi-answer">오늘 <b>{s.name}</b>에서 경유가 가장 싼 곳은 <a href={`/station/${f.id}`}><b>{f.name} {won(f.prices.D047)}</b></a>. 평균 경유 {won(a)}. <span className="muted">({updated()} 기준)</span></p>
    <section><h2>{s.name} 경유 싼 순 {items.length}곳</h2><StationList items={items.map(slim)} prod="D047" avg={a}/></section>
    <AdSlot/>
    <section><h2>{s.name} 시군구 휘발유 최저가</h2><div className="oi-sidos">{s.regions.map(r=><Link key={r.code} href={`/region/${r.code}`}><b>{r.name}</b><span>{won(r.avg.B027?.price)}</span></Link>)}</div></section>
    <Faq items={[[`${s.name}에서 경유가 가장 싼 주유소는?`,`${updated()} 기준 ${f.name}(${f.address??''})이 리터당 ${won(f.prices.D047)}입니다.`],
      [`${s.name} 평균 경유 가격은?`,a?`${eun(s.name)} 평균 경유 ${won(a)}${na?`로 전국 평균(${won(na)})보다 ${a>na?`${won(a-na)} 비쌉니다`:`${won(na-a)} 쌉니다`}`:'입니다'}.`:'자료가 없습니다.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 주유소',SITE+'/'],['경유 최저가',SITE+'/diesel'],[s.name,`${SITE}/diesel/${s.code}`]])}/>
  </div>;
}
