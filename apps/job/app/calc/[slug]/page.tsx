import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Ad} from '../../_components/Ad';
import {SITE} from '../../../lib/fmt';
import {Body,CALCS,faqOf,ORDER,SOURCE,type Slug} from '../info';
import {InsuranceCalc,SeveranceCalc,UnemploymentCalc,WageCalc} from '../Calc';
type P={params:Promise<{slug:string}>};
export const dynamicParams=false;
export function generateStaticParams(){return ORDER.map(slug=>({slug}));}
export async function generateMetadata({params}:P):Promise<Metadata>{const s=(await params).slug as Slug;const c=CALCS[s];if(!c)return {};
  return {title:c.title,description:c.desc,alternates:{canonical:`/calc/${s}`}};}
const TOOL={wage:WageCalc,severance:SeveranceCalc,unemployment:UnemploymentCalc,insurance:InsuranceCalc};
export default async function CalcPage({params}:P){
  const s=(await params).slug as Slug;const c=CALCS[s];if(!c)notFound();const Tool=TOOL[s];
  return <div className="page prose">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/calc">계산기</Link> › {c.short}</nav>
    <h1>{c.icon} {c.h1}</h1>
    <p className="jb-answer">{c.desc}</p>
    <Tool/>
    <Body slug={s}/>
    <Ad/>
    <section><h2>다른 계산기</h2><div className="jb-jump">{ORDER.filter(x=>x!==s).map(x=><Link key={x} href={`/calc/${x}`}>{CALCS[x].icon} {CALCS[x].short}</Link>)}</div></section>
    {(s==='unemployment'||s==='severance')&&<p className="jb-hp"><Link href="/center">🏛️ 우리 동네 관할 고용센터 찾기</Link><a href="https://benefit.guidejung.com/topic">🎁 실직·구직 때 받을 수 있는 지원</a></p>}
    {SOURCE}
    <Faq items={faqOf(s)}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['계산기',SITE+'/calc'],[c.short,`${SITE}/calc/${s}`]])}/>
  </div>;
}
