import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Ad} from '../_components/Ad';
import {SITE} from '../../lib/fmt';
import {Body,CALCS,faqOf,ORDER,SOURCE,YE_SOURCE,type Slug} from './info';
import {InsuranceCalc,SeveranceCalc,UnemploymentCalc,WageCalc,YearEndCalc} from './Calc';
const TOOL={wage:WageCalc,severance:SeveranceCalc,unemployment:UnemploymentCalc,insurance:InsuranceCalc,yearend:YearEndCalc};
/** 계산기 한 쪽(/calc/{slug}) — 연말정산은 하위 페이지가 있어 /calc/yearend/page.tsx에서도 씀. */
export function CalcView({s}:{s:Slug}){
  const c=CALCS[s];const Tool=TOOL[s];
  return <div className="page prose">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/calc">계산기</Link> › {c.short}</nav>
    <h1>{c.icon} {c.h1}</h1>
    <p className="jb-answer">{c.desc}</p>
    <Tool/>
    <Body slug={s}/>
    <Ad/>
    <section><h2>다른 계산기</h2><div className="jb-jump">{ORDER.filter(x=>x!==s).map(x=><Link key={x} href={`/calc/${x}`}>{CALCS[x].icon} {CALCS[x].short}</Link>)}</div></section>
    {(s==='unemployment'||s==='severance')&&<p className="jb-hp"><Link href="/center">🏛️ 우리 동네 관할 고용센터 찾기</Link><a href="https://benefit.guidejung.com/topic">🎁 실직·구직 때 받을 수 있는 지원</a></p>}
    {s==='yearend'?YE_SOURCE:SOURCE}
    <Faq items={faqOf(s)}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['계산기',SITE+'/calc'],[c.short,`${SITE}/calc/${s}`]])}/>
  </div>;
}
