// 연말정산 연봉별(/calc/yearend/2500 … 10000)·상황별(/calc/yearend/couple 등) 정적 페이지(11/14).
// 숫자는 lib/yearendPages.ts → lib/yearend.ts에서만 계산. 정적 HTML에 실제 숫자 + FAQPage·Breadcrumb JSON-LD.
import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Ad} from '../../../_components/Ad';
import {SITE} from '../../../../lib/fmt';
import {KIDS_AGE,YE_CHECKED,YE_YEAR} from '../../../../lib/yearend';
import {CASE_ORDER,CASES,couple,firstJob,man,PAYS,quit,rentTable,scenarios,tips,wonR,type Case} from '../../../../lib/yearendPages';
import {YE_SOURCE} from '../../info';
type P={params:Promise<{case:string}>};
export const dynamicParams=false;
export function generateStaticParams(){return [...PAYS.map(p=>({case:String(p)})),...CASE_ORDER.map(k=>({case:k}))];}
const isPay=(v:string)=>PAYS.includes(Number(v));
const pct=(a:number,b:number)=>b>0?`${(a/b*100).toFixed(1)}%`:'0%';
const sign=(d:number)=>d===0?'변화 없음':d<0?`${wonR(-d)} 줄어요`:`${wonR(d)} 늘어요`;

function payMeta(p:number){const g=p*1e4;const {base}=scenarios(g);
  return {title:`연봉 ${p.toLocaleString('ko-KR')}만 원 연말정산 — ${YE_YEAR}년 귀속 세금 약 ${wonR(base.total)}`,
    desc:`총급여 ${man(g)} 혼자 사는 직장인의 ${YE_YEAR}년 귀속 연말정산 어림: 결정세액(지방소득세 포함) 약 ${wonR(base.total)}, 실효세율 ${pct(base.total,g)}. 신용카드 문턱 ${man(g*0.25)}, 연금저축·월세·자녀·부양가족을 넣으면 얼마나 줄어드는지 표로 보여 드려요.`};}
function caseMeta(k:Case){
  if(k==='couple'){const c=couple();const d=Math.abs(c.kidsHi.sum-c.kidsLo.sum);return {title:CASES[k].title,desc:`맞벌이(총급여 ${man(c.hi)}·${man(c.lo)}, ${KIDS_AGE}세 이상 자녀 2명) 예시로 자녀 공제를 누구에게 넣느냐에 따라 부부 세금 합계가 ${wonR(d)} 차이 나요. 카드는 누구 것으로 쓰는 게 유리한지도 계산해 봤어요.`};}
  if(k==='rent'){const t=rentTable();const a=t.find(x=>x.g===5.5e7)!.cells[1];return {title:CASES[k].title,desc:`월세 세액공제는 총급여 5,500만 원 이하 17%·8,000만 원 이하 15%, 연 1,000만 원까지. 총급여 5,500만 원·월세 60만 원이면 실제로 줄어드는 세금 약 ${wonR(a.real)}(지방소득세 포함). 연봉·월세별 표.`};}
  if(k==='quit'){const q=quit();return {title:CASES[k].title,desc:`연봉 4,800만 원·6월 말 퇴사(총급여 ${man(q.g)}) 예시: 회사 퇴사 정산은 카드·연금저축이 빠져 세금 ${wonR(q.company)}, 5월 종합소득세 신고로 반영하면 ${wonR(q.may)} — 약 ${wonR(q.diff)} 더 돌려받아요.`};}
  if(k==='first'){const f=firstJob();return {title:CASES[k].title,desc:`연봉 3,600만 원 신입이 ${f.map(x=>`${x.m}월 입사면 세금 ${wonR(x.total)}`).join(', ')}(지방소득세 포함 어림). 첫 연말정산에서 챙길 것과 간소화 자료 받는 순서.`};}
  const t=tips();return {title:CASES[k].title,desc:`연봉 5,000만 원 혼자 사는 직장인 기준(세금 약 ${wonR(t.base)}): ${t.rows.slice(0,3).map(r=>`${r.label} ${wonR(-r.diff)}`).join(', ')} 줄어요. 효과 큰 순서대로 정리했어요.`};
}
export async function generateMetadata({params}:P):Promise<Metadata>{
  const v=(await params).case;const m=isPay(v)?payMeta(Number(v)):CASES[v as Case]?caseMeta(v as Case):null;if(!m)return {};
  return {title:m.title,description:m.desc,alternates:{canonical:`/calc/yearend/${v}`}};
}
const T=({head,rows}:{head:string[];rows:(string|number)[][]})=><table className="jb-table"><thead><tr>{head.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table>;

function PayPage({p}:{p:number}){
  const g=p*1e4;const {base,rows}=scenarios(g);const m=payMeta(p);
  const best=[...rows].sort((a,b)=>a.diff-b.diff)[0];
  const near=PAYS.filter(x=>Math.abs(x-p)<=1000&&x!==p);
  const faq:[string,string][]=[
    [`연봉 ${p.toLocaleString('ko-KR')}만 원이면 연말정산 세금은 얼마인가요?`,`혼자 살고 카드를 총급여의 30%(신용 20%·체크 10%) 썼다고 가정하면 ${YE_YEAR}년 귀속 결정세액은 지방소득세 포함 약 ${wonR(base.total)}(실효세율 ${pct(base.total,g)})입니다. 매달 원천징수로 이미 낸 세금이 이보다 많으면 차액을 돌려받습니다.`],
    [`연봉 ${p.toLocaleString('ko-KR')}만 원은 카드를 얼마나 써야 공제가 되나요?`,`총급여의 25%인 ${man(g*0.25)}를 넘게 쓴 금액부터 공제됩니다. 넘은 부분은 신용카드 15%, 체크카드·현금영수증 30%, 전통시장·대중교통 40%입니다.`],
    [`연봉 ${p.toLocaleString('ko-KR')}만 원에서 연금저축 공제는 얼마인가요?`,`연 900만 원까지 납입액의 ${g<=5.5e7?'15':'12'}%를 세금에서 뺍니다(지방소득세 포함 ${g<=5.5e7?'16.5':'13.2'}%). 이 연봉에서 600만 원을 넣으면 세금이 ${sign(rows.find(r=>r.label.startsWith('연금저축·IRP 600'))!.diff)}.`],
    [`연봉 ${p.toLocaleString('ko-KR')}만 원도 월세 세액공제를 받나요?`,g<=8e7?`네. 총급여 8,000만 원 이하라 받을 수 있습니다(무주택 세대주 등 조건). 월세 60만 원(연 720만 원)이면 세금이 ${sign(rows.find(r=>r.label.startsWith('월세'))!.diff)}.`:'아니요. 월세 세액공제는 총급여 8,000만 원 이하만 받습니다.'],
  ];
  return <>
    <h1>🧾 연봉 {p.toLocaleString('ko-KR')}만 원 연말정산</h1>
    <p className="jb-answer">{YE_YEAR}년 귀속 · 혼자·카드 총급여의 30% 사용 기준 <b>내야 할 세금 약 {wonR(base.total)}</b>(소득세 {wonR(base.tax)} + 지방소득세 {wonR(base.local)}) · 실효세율 {pct(base.total,g)}</p>
    <p>{m.desc}</p>
    <p className="jb-hp"><Link href="/calc/yearend">🧮 내 숫자로 바로 계산하기</Link></p>
    <section><h2>이렇게 하면 세금이 얼마나 바뀔까</h2>
      <T head={['이렇게 하면','내야 할 세금','기본보다']} rows={[['기본(혼자·신용 20%+체크 10%)',wonR(base.total),'—'],...rows.map(r=>[r.note?`${r.label} (${r.note})`:r.label,wonR(r.total),sign(r.diff)])]}/>
      <p className="muted small">가장 크게 줄어드는 것: <b>{best.label}</b>({sign(best.diff)}). 세금이 이미 0원에 가까우면 공제를 더 넣어도 더 줄지 않아요. 카드는 문턱({man(g*0.25)})까지 신용카드를 써도 공제가 같아요 — 문턱을 넘긴 뒤 쓰는 금액만 체크카드·현금영수증(30%)이면 모두 체크카드로 쓴 것과 같아요.</p></section>
    <section><h2>계산 과정</h2>
      <T head={['단계','금액']} rows={[['총급여',wonR(g)],['근로소득공제',wonR(base.earned)],['근로소득금액',wonR(base.income)],['인적공제(본인)',wonR(base.personal)],
        ['신용카드 등 소득공제',`${wonR(base.card.deduction)} (문턱 ${wonR(base.card.threshold)})`],['과세표준',wonR(base.base)],['산출세액',wonR(base.calc)],['세액공제',wonR(base.credits)],['결정세액(소득세)',wonR(base.tax)],['지방소득세',wonR(base.local)]]}/>
      <p className="muted small">4대보험은 총급여로 어림했어요. 의료비·교육비·보험료·기부금·주택자금은 넣지 않았어요.</p></section>
    <Ad/>
    <section><h2>비슷한 연봉</h2><div className="jb-jump">{near.map(x=><Link key={x} href={`/calc/yearend/${x}`}>{x.toLocaleString('ko-KR')}만 원</Link>)}</div></section>
    <section><h2>상황별로 보기</h2><div className="jb-jump">{CASE_ORDER.map(k=><Link key={k} href={`/calc/yearend/${k}`}>{CASES[k].icon} {CASES[k].short}</Link>)}</div></section>
    {YE_SOURCE}
    <Faq items={faq}/>
  </>;
}

function CasePage({k}:{k:Case}){
  const c=CASES[k];const m=caseMeta(k);let body:ReactNode=null;let faq:[string,string][]=[];
  if(k==='couple'){const x=couple();
    body=<>
      <section><h2>자녀 공제는 누구에게?</h2><p>총급여 {man(x.hi)}인 사람과 {man(x.lo)}인 사람, 만 {KIDS_AGE}세 이상 자녀 2명, 카드는 둘이 {man(x.cards)}를 반씩 썼다고 했을 때 부부 세금 합계(지방소득세 포함):</p>
        <T head={['자녀 2명을','연봉 높은 쪽 세금','낮은 쪽 세금','부부 합계']} rows={[[`연봉 ${man(x.hi)} 쪽에`,wonR(x.kidsHi.hi),wonR(x.kidsHi.lo),wonR(x.kidsHi.sum)],[`연봉 ${man(x.lo)} 쪽에`,wonR(x.kidsLo.hi),wonR(x.kidsLo.lo),wonR(x.kidsLo.sum)]]}/>
        <p>차이 <b>{wonR(Math.abs(x.kidsHi.sum-x.kidsLo.sum))}</b>. 인적공제(1명 150만 원)는 세율이 높은 쪽에서 더 큰 효과가 나서 보통 연봉이 높은 쪽이 유리해요. 자녀세액공제는 금액이 정해져 있어 같아요(다만 세금이 적어 다 못 쓰면 손해).</p></section>
      <section><h2>카드는 누구 것으로?</h2><p>자녀는 연봉 높은 쪽에 두고, 가구 카드 {man(x.cards)}를 한 사람 이름으로 몰아 썼다면:</p>
        <T head={['카드를','부부 합계']} rows={[[`연봉 ${man(x.hi)} 쪽으로`,wonR(x.cardHi.sum)],[`연봉 ${man(x.lo)} 쪽으로`,wonR(x.cardLo.sum)]]}/>
        <p>카드 공제는 총급여의 25%(문턱)를 넘긴 금액부터라 문턱이 낮은 쪽({man(x.lo*0.25)})이 먼저 넘겨요. 다만 같은 공제액이라도 세율이 높은 쪽(연봉 높은 쪽)에서 세금이 더 줄어서, 위 표처럼 두 경우를 계산해 비교해 보세요.</p></section>
      <section><h2>맞벌이가 확인할 것</h2><ul><li>부양가족(자녀·부모)은 한 사람만 공제받아요. 둘 다 넣으면 나중에 가산세가 붙을 수 있어요.</li><li>의료비는 공제받는 사람이 아니라 실제로 낸 사람 기준이에요(총급여 3% 문턱이 낮은 쪽이 유리할 때가 많아요).</li><li>월세는 주소가 다른 부부도 각각 받을 수 있어요(부부 합산 연 1,000만 원).</li></ul></section></>;
    faq=[['맞벌이 자녀 공제는 누구에게 넣어야 하나요?',`세율이 높은 쪽(보통 연봉이 높은 쪽)이 인적공제 효과가 커요. 예시(총급여 ${man(x.hi)}·${man(x.lo)}, 자녀 2명)에서는 부부 합계가 ${wonR(Math.abs(x.kidsHi.sum-x.kidsLo.sum))} 차이 났어요.`],['자녀를 부부 둘 다 공제받을 수 있나요?','아니요. 한 자녀는 한 사람만 기본공제·자녀세액공제를 받을 수 있어요.']];}
  if(k==='rent'){const t=rentTable();
    body=<>
      <section><h2>연봉·월세별로 줄어드는 세금(지방소득세 포함)</h2>
        <T head={['총급여(공제율)',...t[0].cells.map(c=>`월세 ${man(c.m)}`)]} rows={t.map(r=>[`${man(r.g)} (${r.rate}%)`,...r.cells.map(c=>c.real<c.nominal?`${wonR(c.real)} (계산상 ${wonR(c.nominal)})`:wonR(c.real))])}/>
        <p className="muted small">혼자·카드 총급여 30% 기준. 괄호 안 금액보다 적게 줄어드는 칸은 낼 세금이 그보다 적어 다 못 받는 경우예요. 연 1,000만 원까지 공제돼서 월 80만 원(연 960만 원)이 거의 한도예요.</p></section>
      <section><h2>받을 수 있는 조건</h2><ul><li>총급여 8,000만 원 이하(종합소득금액 7,000만 원 이하) 무주택 세대주(세대원도 일부 가능)</li><li>국민주택규모(전용 85㎡) 이하이거나 기준시가 4억 원 이하 주택·오피스텔·고시원</li><li>임대차계약서 주소와 주민등록 주소가 같아야 해요. 계좌이체 내역을 챙겨 두세요.</li><li>집주인 동의는 필요 없어요. 회사에 내지 못했으면 5월 종합소득세 신고로 받아요.</li></ul></section></>;
    const a=t.find(x=>x.g===5.5e7)!.cells[1],b=t.find(x=>x.g===2.5e7)!.cells[1];
    faq=[['월세 세액공제는 얼마나 되나요?',`총급여 5,500만 원 이하 17%, 8,000만 원 이하 15%(연 1,000만 원까지)예요. 예시로 총급여 5,500만 원·월세 60만 원이면 세금이 약 ${wonR(a.real)} 줄어요.`],['연봉이 낮으면 월세 공제를 다 못 받나요?',`네. 세액공제는 낼 세금에서 빼는 거라 세금보다 많이 받을 수 없어요. 예시로 총급여 2,500만 원·월세 60만 원은 계산상 ${wonR(b.nominal)}이지만 실제로 줄어드는 세금은 ${wonR(b.real)}이에요.`]];}
  if(k==='quit'){const q=quit();
    body=<>
      <section><h2>예시: 연봉 4,800만 원, 6월 말 퇴사</h2>
        <T head={['','내야 할 세금(지방소득세 포함)']} rows={[['회사 퇴사 정산(카드·연금저축 반영 안 됨)',wonR(q.company)],['5월 종합소득세 신고(카드 900만·연금저축 300만 원 반영)',wonR(q.may)],['더 돌려받는 금액',wonR(q.diff)]]}/>
        <p className="muted small">총급여 {man(q.g)}(6개월) 기준 어림. 카드 공제는 근무한 기간에 쓴 금액만 들어가요.</p></section>
      <section><h2>퇴사했다면 순서</h2><ol><li>퇴사한 달 월급에서 회사가 <b>퇴사 정산</b>을 해요(기본공제·4대보험만 반영되는 경우가 많아요).</li><li>그해 안에 다시 취업하면 새 회사에 <b>전 회사 원천징수영수증</b>을 내서 합쳐 연말정산해요.</li><li>재취업하지 않았다면 다음 해 <b>5월 1~31일 홈택스 종합소득세 신고</b>로 카드·의료비·연금저축 등을 넣어 돌려받아요.</li></ol></section></>;
    faq=[['중도 퇴사하면 연말정산은 어떻게 하나요?','퇴사할 때 회사가 정산하고, 그해 재취업하면 새 회사에서 합쳐 정산해요. 재취업하지 않았다면 다음 해 5월 종합소득세 신고로 빠진 공제를 넣어요.'],['중도 퇴사자는 얼마나 더 돌려받나요?',`예시(연봉 4,800만 원·6월 말 퇴사, 카드 900만·연금저축 300만 원)에서는 5월 신고로 약 ${wonR(q.diff)}를 더 돌려받아요.`]];}
  if(k==='first'){const f=firstJob();
    body=<>
      <section><h2>연봉 3,600만 원 신입, 입사한 달별 세금</h2>
        <T head={['입사','그해 총급여','신용카드 등 공제','내야 할 세금']} rows={f.map(x=>[`${x.m}월`,wonR(x.g),wonR(x.card),wonR(x.total)])}/>
        <p className="muted small">혼자·입사 뒤 카드를 총급여의 30% 사용 기준 어림. 매달 월급에서 떼어 간 세금(원천징수)이 이보다 많으면 그만큼 돌려받아요.</p></section>
      <section><h2>첫 연말정산에서 챙길 것</h2><ul><li>보통 1월 15일 국세청 홈택스 <b>연말정산 간소화 서비스</b>가 열리면 자료를 내려받아 회사에 내요.</li><li>카드·의료비·보험료는 <b>입사한 뒤 쓴 금액만</b> 공제돼요. 연금저축·기부금은 1년 전체가 들어가요.</li><li>올해 입사 전에 다른 회사에 다녔다면 그 회사 원천징수영수증을 꼭 같이 내요.</li><li>중소기업에 다니는 청년(15~34세)은 소득세 감면 신청 대상인지 회사에 물어보세요.</li></ul></section></>;
    faq=[['신입사원도 연말정산을 하나요?','네. 그해 근로소득이 있으면 다음 해 1~2월에 회사에서 연말정산을 해요. 입사 전 다른 근로소득이 있었다면 그 자료도 함께 내요.'],['7월에 입사하면 세금이 얼마나 되나요?',`연봉 3,600만 원 예시로 그해 총급여 ${wonR(f[2].g)}이면 내야 할 세금은 약 ${wonR(f[2].total)}이에요. 원천징수로 이미 낸 세금이 더 많으면 돌려받아요.`]];}
  if(k==='tips'){const t=tips();
    body=<>
      <section><h2>연봉 5,000만 원(혼자, 세금 약 {wonR(t.base)})이 하나씩 해 보면</h2>
        <T head={['방법','줄어드는 세금','그때 세금']} rows={t.rows.map(r=>[r.note?`${r.label} (${r.note})`:r.label,wonR(-r.diff),wonR(r.total)])}/>
        <p className="muted small">효과 큰 순서. 여러 개를 함께 하면 합이 다를 수 있어요(세금이 0원 밑으로 내려가지 않음).</p></section>
      <section><h2>지금(연말 전)에 할 수 있는 것</h2><ul><li>총급여의 25%를 이미 넘겼다면 남은 기간은 체크카드·현금영수증으로(공제율 2배).</li><li>연금저축·IRP는 12월 31일 납입분까지 그해 공제예요.</li><li>월세 계약서·이체 내역, 부양가족 소득(연 100만 원 이하)을 미리 확인해요.</li></ul></section></>;
    faq=[['13월의 월급을 늘리려면 무엇부터 하나요?',`연봉 5,000만 원 혼자 기준으로는 ${t.rows.slice(0,2).map(r=>`${r.label}(${wonR(-r.diff)})`).join('·')} 순으로 효과가 컸어요.`],['연금저축은 언제까지 넣어야 올해 공제되나요?','12월 31일까지 낸 금액이 그해 공제 대상이에요. 연 900만 원(연금저축만은 600만 원)까지예요.']];}
  return <>
    <h1>{c.icon} {c.h1}</h1>
    <p className="jb-answer">{m.desc}</p>
    <p className="jb-hp"><Link href="/calc/yearend">🧮 내 숫자로 바로 계산하기</Link></p>
    {body}
    <Ad/>
    <section><h2>다른 상황</h2><div className="jb-jump">{CASE_ORDER.filter(x=>x!==k).map(x=><Link key={x} href={`/calc/yearend/${x}`}>{CASES[x].icon} {CASES[x].short}</Link>)}</div></section>
    <section><h2>연봉별로 보기</h2><div className="jb-jump">{PAYS.map(p=><Link key={p} href={`/calc/yearend/${p}`}>{p.toLocaleString('ko-KR')}만</Link>)}</div></section>
    {YE_SOURCE}
    <Faq items={faq}/>
  </>;
}
export default async function YearEndCase({params}:P){
  const v=(await params).case;const pay=isPay(v);if(!pay&&!CASES[v as Case])notFound();
  const name=pay?`연봉 ${Number(v).toLocaleString('ko-KR')}만 원`:CASES[v as Case].short;
  return <div className="page prose">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/calc">계산기</Link> › <Link href="/calc/yearend">연말정산</Link> › {name}</nav>
    {pay?<PayPage p={Number(v)}/>:<CasePage k={v as Case}/>}
    <p className="muted small">확인 {YE_CHECKED} · {YE_YEAR}년 귀속(다음 해 1~2월 정산) 기준 어림값이에요.</p>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['계산기',SITE+'/calc'],['연말정산',SITE+'/calc/yearend'],[name,`${SITE}/calc/yearend/${v}`]])}/>
  </div>;
}
