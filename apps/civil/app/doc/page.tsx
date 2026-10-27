import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {docs,docList,menus,n,nation,SITE,updated} from '../../lib/data';
export const metadata:Metadata={title:'서류별로 찾기 · 무인민원발급기에서 뗄 수 있는 서류',description:`주민등록등본·가족관계증명서·건축물대장 등 서류를 고르면 그 서류를 뗄 수 있는 가까운 무인민원발급기를 보여 드립니다. 전국 발급기 서류 ${n(docList.length)}종.`,alternates:{canonical:'/doc'}};
export default function Docs(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 서류별</nav>
  <h1>🧾 어떤 서류가 필요하세요?</h1>
  <p className="cv-answer">서류를 고르면 그 서류를 <b>뗄 수 있는 가까운 무인민원발급기</b>만 보여 드려요. 전국 발급기 {n(nation.kinds.kiosk)}대에서 뗄 수 있는 서류는 <b>{n(docList.length)}종</b>이에요. <span className="muted">({updated()} 기준)</span></p>
  <div className="cv-kinds">{docs.filter(d=>d.count).map(d=><Link key={d.slug} href={`/doc/${d.slug}`} className="cv-kindcard"><span aria-hidden="true">🧾</span><span><b>{d.title}</b><small>{d.tip}</small></span><em>{n(d.count)}대</em></Link>)}</div>
  <section><h2>발급기 서류 분류</h2><ol className="cv-rank">{menus.slice(0,20).map(([m,c])=><li key={m}><span><b>{m}</b><span>{n(c)}종</span></span></li>)}</ol></section>
  <Faq items={[['무인민원발급기에서 어떤 서류를 뗄 수 있나요?',`전국 발급기를 합쳐 ${n(docList.length)}종입니다. ${menus.slice(0,5).map(([m,c])=>`${m} ${n(c)}종`).join(', ')} 등이고, 기계마다 다릅니다.`]]}/>
  <JsonLd data={breadcrumbLd([['내근처 서류',SITE+'/'],['서류별',SITE+'/doc']])}/>
</div>;}
