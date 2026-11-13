// 연도별 최저임금 월급·주휴수당(/calc/minimum-wage/2026, /2027 …) — 해마다 같은 주소 모양, 새 고시는 lib/calc.ts MIN_WAGES 한 줄(11/14).
import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Ad} from '../../../_components/Ad';
import {SITE} from '../../../../lib/fmt';
import {CHECKED,MIN_WAGES,wage,won,YEAR} from '../../../../lib/calc';
type P={params:Promise<{year:string}>};
export const dynamicParams=false;
export function generateStaticParams(){return Object.keys(MIN_WAGES).map(year=>({year}));}
const info=(y:number)=>{const m=MIN_WAGES[y];if(!m)return null;const prev=MIN_WAGES[y-1];const w=wage(m.hourly,40);
  return {y,m,prev,w,up:prev?m.hourly-prev.hourly:null,rate:prev?((m.hourly/prev.hourly-1)*100).toFixed(1):null,monthUp:prev?w.month-wage(prev.hourly,40).month:null};};
export async function generateMetadata({params}:P):Promise<Metadata>{const x=info(Number((await params).year));if(!x)return {};
  return {title:`${x.y} 최저임금 ${x.m.hourly.toLocaleString('ko-KR')}원 — 월급 ${won(x.w.month)}·주휴수당 계산`,
    description:`${x.y}년 최저임금 시간급 ${won(x.m.hourly)}${x.up!=null?`(${x.up.toLocaleString('ko-KR')}원·${x.rate}% 인상)`:''}. 주 40시간 월 209시간이면 ${won(x.w.month)}, 주 15·20·25·30시간 아르바이트 월급과 주휴수당을 표로 정리했어요.`,
    alternates:{canonical:`/calc/minimum-wage/${x.y}`}};}
export default async function MinWage({params}:P){
  const x=info(Number((await params).year));if(!x)notFound();const {y,m,w}=x;
  const parts=[15,20,25,30,35].map(h=>({h,r:wage(m.hourly,h)}));
  const years=Object.keys(MIN_WAGES).map(Number);
  return <div className="page prose">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/calc">계산기</Link> › {y} 최저임금</nav>
    <h1>⏱️ {y}년 최저임금 {m.hourly.toLocaleString('ko-KR')}원</h1>
    <p className="jb-answer">시간급 <b>{won(m.hourly)}</b>{x.up!=null&&<> · {y-1}년보다 {x.up.toLocaleString('ko-KR')}원({x.rate}%) 올라요</>} · 주 40시간이면 월 <b>{won(w.month)}</b>(주휴 포함 209시간)</p>
    {y>YEAR&&<p className="jb-note">{y}년 1월 1일부터 적용돼요. 지금({YEAR}년)은 {won(MIN_WAGES[YEAR].hourly)}이에요.</p>}
    <section><h2>한눈에</h2><table className="jb-table"><tbody>
      <tr><th>시급</th><td>{won(m.hourly)}</td></tr><tr><th>일급(8시간)</th><td>{won(m.hourly*8)}</td></tr>
      <tr><th>주급(40시간 + 주휴 8시간)</th><td>{won(w.week)}</td></tr><tr><th>월급(209시간)</th><td>{won(w.month)}{x.monthUp!=null&&<> (전년보다 {won(x.monthUp)} ↑)</>}</td></tr><tr><th>연봉 어림(월급 × 12)</th><td>{won(w.year)}</td></tr></tbody></table></section>
    <section><h2>아르바이트 1주 시간별 월급(주휴 포함)</h2><table className="jb-table"><thead><tr><th>1주</th><th>주휴수당(1주)</th><th>월 시간</th><th>월급</th></tr></thead><tbody>
      {parts.map(({h,r})=><tr key={h}><td>{h}시간</td><td>{won(r.holidayPay)}</td><td>{r.monthHours}시간</td><td>{won(r.month)}</td></tr>)}</tbody></table>
      <p className="muted small">주휴수당은 1주 소정근로시간이 15시간 이상이고 그 주를 개근했을 때 1주 시간 ÷ 40 × 8시간만큼 받아요. 한 달은 365 ÷ 12 ÷ 7주로 계산.</p></section>
    <p className="jb-hp"><Link href="/calc/wage">🧮 내 시급·시간으로 계산하기</Link><Link href="/calc/insurance">4대보험 빼면 얼마?</Link></p>
    <Ad/>
    {years.length>1&&<section><h2>연도별 최저임금</h2><div className="jb-jump">{years.map(v=><Link key={v} href={`/calc/minimum-wage/${v}`}>{v}년 {MIN_WAGES[v].hourly.toLocaleString('ko-KR')}원</Link>)}</div></section>}
    <p className="jb-note">기준: {m.notice}(업종·규모 관계없이 모든 사업장 동일 적용). 확인 {CHECKED}. 수습 3개월(1년 이상 계약, 단순 노무 제외)은 90%까지 줄 수 있어요.</p>
    <Faq items={[[`${y}년 최저임금은 얼마인가요?`,`시간급 ${won(m.hourly)}입니다${x.up!=null?`. ${y-1}년 ${won(x.prev!.hourly)}보다 ${x.up.toLocaleString('ko-KR')}원(${x.rate}%) 올랐습니다`:''}.`],
      [`${y}년 최저임금 월급은 얼마인가요?`,`주 40시간·주휴 포함 월 209시간 기준 ${won(w.month)}입니다.`],
      [`${y}년 주 20시간 아르바이트 월급은?`,`주휴수당 포함 월 ${parts[1].r.monthHours}시간, ${won(parts[1].r.month)}입니다(1주 주휴수당 ${won(parts[1].r.holidayPay)}).`],
      [`${y}년 주 15시간 미만이면 주휴수당이 없나요?`,`네. 1주 소정근로시간이 15시간 미만이면 주휴수당이 없습니다. 주 14시간이면 월 ${won(wage(m.hourly,14).month)}입니다.`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['계산기',SITE+'/calc'],[`${y} 최저임금`,`${SITE}/calc/minimum-wage/${y}`]])}/>
  </div>;
}
