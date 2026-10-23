import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {BRANDS,brand} from '../../../lib/brands';
import {SITE} from '../../../lib/fmt';
export const dynamicParams=false;
export function generateStaticParams(){return BRANDS.map(b=>({slug:b.slug}));}
type P={params:Promise<{slug:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{const b=brand((await params).slug);if(!b)return {};
  return {title:`${b.name} 서비스센터 고객센터 번호${b.phones[0]?` ${b.phones[0].tel}`:''} · 접수 방법`,description:`${b.name}: ${b.phones.map(p=>`${p.label} ${p.tel}`).join(', ')||'공식 지원 페이지 안내'}${b.hours?` · ${b.hours}`:''}. ${b.products} 수리 접수 방법과 공식 센터 찾기.`.slice(0,160),alternates:{canonical:`/brand/${b.slug}`}};}
export default async function BrandPage({params}:P){
  const b=brand((await params).slug);if(!b)notFound();
  const others=BRANDS.filter(x=>x.slug!==b.slug);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/brand">가전·휴대폰</Link> › {b.name}</nav>
    <h1>{b.icon} {b.name} 서비스센터</h1>
    <p className="sv-answer">{b.phones.length?<><b>{b.phones[0].label} {b.phones[0].tel}</b>{b.hours?<> · {b.hours}</>:null}</>:<b>공식 지원 페이지에서 예약·위치를 확인하세요</b>} <span className="muted">· {b.products}</span></p>
    {b.phones.length>0&&<section><h2>📞 고객센터 번호</h2><div className="sv-cards">{b.phones.map(p=><a key={p.tel} className="sv-card" href={`tel:${p.tel.replace(/[^0-9]/g,'')}`}><span className="sv-kind" aria-hidden="true">📞</span><span className="sv-card-body"><b>{p.tel}</b><small>{p.label}</small>{p.note&&<small className="muted">{p.note}</small>}</span></a>)}</div></section>}
    <section className="sv-guide"><h2>알아 두면 좋은 점</h2><ul>{b.notes.map(x=><li key={x}>{x}</li>)}</ul></section>
    <section><h2>🔗 공식 센터 찾기·예약</h2><div className="sv-jump">{b.links.map(([t,u])=><a key={u} href={u} rel="noopener" target="_blank">{t} ↗</a>)}</div></section>
    <AdSlot/>
    <section><h2>다른 브랜드</h2><div className="sv-jump">{others.map(o=><Link key={o.slug} href={`/brand/${o.slug}`}>{o.icon} {o.name}</Link>)}</div></section>
    <Faq items={[
      [`${b.name} 고객센터 번호는?`,b.phones.length?b.phones.map(p=>`${p.label} ${p.tel}${p.note?`(${p.note})`:''}`).join(', ')+'입니다.':`${b.company} 지원 전화번호는 공식 지원 문의 페이지에서 국가별로 안내합니다.`],
      ...(b.hours?[[`${b.name} 상담 시간은?`,`${b.hours}입니다(공식 누리집 기준). 센터별 방문 시간은 다를 수 있어요.`] as [string,string]]:[]),
      [`가까운 ${b.name} 센터는 어디서 찾나요?`,`공식 누리집(${b.links[0][1]})의 센터 찾기·예약 메뉴에서 지역으로 찾을 수 있습니다.`],
    ]}/>
    <p className="muted small">{b.checked} 공식 누리집에서 확인한 정보예요. 번호·운영 시간은 바뀔 수 있으니 공식 누리집에서 다시 확인하세요. 이 사이트는 {b.company}와 관계없는 정보 안내 사이트입니다.</p>
    <JsonLd data={{'@context':'https://schema.org','@type':'Organization',name:b.company,url:b.links[0][1],...(b.phones.length?{contactPoint:b.phones.map(p=>({'@type':'ContactPoint',telephone:p.tel,contactType:p.label,areaServed:'KR',availableLanguage:'Korean'}))}:{})}}/>
    <JsonLd data={breadcrumbLd([['내근처 서비스센터',SITE+'/'],['가전·휴대폰',SITE+'/brand'],[b.name,`${SITE}/brand/${b.slug}`]])}/>
  </div>;
}
