import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Ad} from '../_components/Ad';
import {SITE} from '../../lib/fmt';
import {MIN_WAGE,MIN_WAGES,UI_MAX,wage,won,YEAR} from '../../lib/calc';
import {CALCS,ORDER,SOURCE} from './info';
const w=wage(MIN_WAGE,40);
export const metadata:Metadata={title:`${YEAR} 일자리 계산기 — 시급·주휴수당·월급·실업급여·퇴직금·4대보험`,description:`${YEAR}년 최저임금 ${MIN_WAGE.toLocaleString('ko-KR')}원 기준 주휴수당·월급(209시간 ${won(w.month)}), 실업급여(상한 ${won(UI_MAX)}), 퇴직금, 4대보험 공제를 바로 계산해요.`,alternates:{canonical:'/calc'}};
export default function CalcHub(){
  return <div className="page prose">
    <nav className="crumbs"><Link href="/">홈</Link> › 계산기</nav>
    <h1>🧮 일자리 계산기</h1>
    <p className="jb-answer">{YEAR}년 최저임금 <b>시간급 {MIN_WAGE.toLocaleString('ko-KR')}원</b> · 주 40시간이면 월 <b>{won(w.month)}</b>(주휴 포함 209시간)</p>
    <div className="jb-situ">{ORDER.map(s=><Link key={s} href={`/calc/${s}`}><span aria-hidden="true">{CALCS[s].icon}</span><span><b>{CALCS[s].short}</b><small>{CALCS[s].desc.split('. ')[0]}</small></span></Link>)}</div>
    <section><h2>{YEAR}년 최저임금 한눈에</h2><table className="jb-table"><tbody>
      <tr><th>시급</th><td>{won(MIN_WAGE)}</td></tr><tr><th>일급(8시간)</th><td>{won(MIN_WAGE*8)}</td></tr>
      <tr><th>주급(40시간 + 주휴 8시간)</th><td>{won(w.week)}</td></tr><tr><th>월급(209시간)</th><td>{won(w.month)}</td></tr><tr><th>연봉 어림</th><td>{won(w.year)}</td></tr></tbody></table></section>
    <p className="jb-hp">{Object.keys(MIN_WAGES).map(y=><Link key={y} href={`/calc/minimum-wage/${y}`}>⏱️ {y}년 최저임금 {MIN_WAGES[+y].hourly.toLocaleString('ko-KR')}원 월급·주휴수당</Link>)}<Link href="/calc/yearend/tips">💰 13월의 월급 늘리는 법</Link></p>
    <Ad/>
    {SOURCE}
    <Faq items={[[`${YEAR}년 최저임금 월급은 얼마인가요?`,`주 40시간·주휴 포함 월 209시간 기준 ${won(w.month)}입니다(시간급 ${MIN_WAGE.toLocaleString('ko-KR')}원).`],['어떤 계산기가 있나요?','시급·주휴수당·월급, 실업급여(구직급여), 퇴직금, 4대보험 공제 계산기가 있습니다.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['계산기',SITE+'/calc']])}/>
  </div>;
}
