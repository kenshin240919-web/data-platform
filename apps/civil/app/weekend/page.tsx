import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearCivil} from '../_components/NearCivil';
import {Ad} from '../_components/Ad';
import {allDayKiosks,n,placePath,sidos,SITE,updated,weekendKiosks} from '../../lib/data';
export const metadata:Metadata={title:`주말·공휴일에 쓰는 무인민원발급기 ${n(weekendKiosks.length)}대`,description:`토·일·공휴일에도 서류를 뗄 수 있는 무인민원발급기 전국 ${n(weekendKiosks.length)}대(24시간 ${n(allDayKiosks.length)}대). 시도별 목록과 운영 시간.`,alternates:{canonical:'/weekend'}};
export default function Weekend(){
  const by=sidos.map(s=>({name:s.name,items:weekendKiosks.filter(k=>s.regions.some(r=>r.id===k.region))})).filter(s=>s.items.length);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 주말 발급기</nav>
    <h1>📅 주말·공휴일에 쓰는 무인민원발급기</h1>
    <p className="cv-answer">토·일·공휴일 운영 시간이 등록된 발급기 전국 <b>{n(weekendKiosks.length)}대</b> · 24시간 <b>{n(allDayKiosks.length)}대</b>. <span className="muted">({updated()} 기준)</span></p>
    <NearCivil kind="kiosk"/>
    <Ad/>
    {allDayKiosks.length>0&&<section id="allday"><h2>🌙 24시간 발급기 <span className="muted">{n(allDayKiosks.length)}대</span></h2><ul className="cv-plain">{allDayKiosks.slice(0,300).map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> <span className="muted">· {p.region_name}{p.spot?` · ${p.spot}`:''}</span></li>)}</ul></section>}
    {by.map(s=><section key={s.name}><h2>{s.name} <span className="muted">{n(s.items.length)}대</span></h2><ul className="cv-plain">{s.items.map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> <span className="muted">· {p.region_name} · 주말 {p.hol!.join('~')}</span></li>)}</ul></section>)}
    <Faq items={[['주말에 서류를 뗄 수 있는 곳은?',`주말·공휴일 운영 시간이 등록된 무인민원발급기가 전국 ${n(weekendKiosks.length)}대 있습니다. 지하철역·대형 상가·병원 등에 많고, 관공서 안 발급기는 대부분 주말에 쉽니다.`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 서류',SITE+'/'],['주말 발급기',SITE+'/weekend']])}/>
  </div>;
}
