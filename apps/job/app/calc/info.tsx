// 계산기 페이지 설명·예시·FAQ(정적 HTML — 검색엔진·AI 답변이 읽는 부분). 숫자는 lib/calc.ts에서 계산.
import {CHECKED,insurance,MIN_WAGE,MIN_WAGES,RATE_YEAR,RATES,severance,UI_MAX,UI_YEAR,unemployment,uiDays,wage,won,YEAR} from '../../lib/calc';
import {CASE_ORDER,CASES,PAYS} from '../../lib/yearendPages';
import {childCredit,earnedDeduction,KIDS_AGE,taxOf,YE_CHECKED,YE_YEAR,yearEnd,type YeIn} from '../../lib/yearend';
export type Slug='wage'|'severance'|'unemployment'|'insurance'|'yearend';
const w40=wage(MIN_WAGE,40),w20=wage(MIN_WAGE,20),w15=wage(MIN_WAGE,15),w14=wage(MIN_WAGE,14);
const floor8=Math.round(MIN_WAGE*0.8*8);
// 예시(정적 HTML·FAQ용): 4대보험은 calc.ts 요율로 어림, 신용카드 등은 총급여의 30%를 반반 썼다고 가정
const yeEx=(g:number,o:Partial<YeIn>={})=>{const i=insurance(g/12);return yearEnd({gross:g,insurance:(i.health+i.ltc+i.employ)*12,pension:i.pension*12,people:1,elder:0,kids:0,credit:g*0.15,debit:g*0.15,special:0,pensionSave:0,rent:0,married:false,paid:null,...o});};
const YE_EX=[30e6,40e6,50e6,70e6].map(g=>({g,r:yeEx(g)}));
const man=(v:number)=>`${Math.round(v/1e4).toLocaleString('ko-KR')}만 원`;
export const CALCS:Record<Slug,{icon:string;title:string;h1:string;desc:string;short:string}>={
  wage:{icon:'⏱️',title:`${YEAR} 시급·주휴수당·월급 계산기`,h1:'시급 → 주휴수당·월급 계산',short:'시급·주휴수당·월급',
    desc:`${YEAR}년 최저임금 시간급 ${MIN_WAGE.toLocaleString('ko-KR')}원 기준. 주 40시간이면 주휴 포함 월 209시간 ${won(w40.month)}. 시급과 1주 일하는 시간을 넣으면 주휴수당·주급·월급을 바로 계산해요.`},
  severance:{icon:'💼',title:'퇴직금 계산기 — 1일 평균임금 × 30 × 재직일수 ÷ 365',h1:'퇴직금 계산',short:'퇴직금',
    desc:'퇴직 전 3개월 임금 총액과 재직 기간을 넣으면 1일 평균임금과 퇴직금을 어림해요. 1년 이상·주 15시간 이상 일했을 때 받아요.'},
  unemployment:{icon:'🧾',title:`${YEAR} 실업급여(구직급여) 계산기 — 하루 얼마, 며칠?`,h1:'실업급여(구직급여) 계산',short:'실업급여',
    desc:`구직급여는 이직 전 1일 평균임금의 60%. ${YEAR}년 하한 ${won(floor8)}(8시간 기준)·상한 ${won(UI_MAX)}, 받는 날수 120~270일. 내 금액과 날수를 어림해요.`},
  yearend:{icon:'🧾',title:`${YE_YEAR} 연말정산 계산기 — 13월의 월급 얼마?`,h1:`${YE_YEAR}년 귀속 연말정산 어림 계산`,short:'연말정산',
    desc:`${YE_YEAR}년 귀속(${YE_YEAR+1}년 1~2월 정산) 기준. 총급여 ${man(YE_EX[1].g)} 혼자 사는 직장인은 결정세액 약 ${won(YE_EX[1].r.total)}(지방소득세 포함). 연봉·부양가족·카드 사용액을 넣으면 세금과 환급 금액을 어림해요.`},
  insurance:{icon:'🧮',title:`${RATE_YEAR} 4대보험 계산기 — 월급에서 얼마 빠질까?`,h1:'4대보험 공제 계산',short:'4대보험 공제',
    desc:`${RATE_YEAR}년 근로자 부담: 국민연금 ${(RATES.pension*100).toFixed(2)}%·건강보험 ${(RATES.health*100).toFixed(3)}%·장기요양(건강보험료의 ${(RATES.ltc*100).toFixed(2)}%)·고용보험 ${(RATES.employ*100).toFixed(1)}%. 월급을 넣으면 4대보험 금액과 남는 금액을 계산해요.`},
};
export const ORDER:Slug[]=['yearend','wage','unemployment','severance','insurance'];
const T=({rows,head}:{rows:(string|number)[][];head:string[]})=><table className="jb-table"><thead><tr>{head.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table>;
export function Body({slug}:{slug:Slug}){
  if(slug==='yearend')return <>
    <section><h2>연봉별로 계산하면 (혼자·카드 총급여의 30% 사용)</h2>
      <T head={['총급여','근로소득공제','과세표준','내야 할 세금(지방세 포함)']} rows={YE_EX.map(({g,r})=>[man(g),won(r.earned),won(r.base),won(r.total)])}/>
      <p className="muted small">신용카드 15%·체크카드 15%씩 썼다고 가정. 의료비·교육비·보험료·기부금 등은 넣지 않은 어림값이에요.</p></section>
    <section><h2>내 연봉으로 자세히 보기</h2><div className="jb-jump">{PAYS.map(p=><a key={p} href={`/calc/yearend/${p}`}>{p.toLocaleString('ko-KR')}만 원</a>)}</div></section>
    <section><h2>상황별로 보기</h2><div className="jb-situ">{CASE_ORDER.map(k=><a key={k} href={`/calc/yearend/${k}`}><span aria-hidden="true">{CASES[k].icon}</span><span><b>{CASES[k].short}</b><small>{CASES[k].h1}</small></span></a>)}</div></section>
    <section><h2>계산 순서</h2><ol>
      <li><b>근로소득금액</b> = 총급여 − 근로소득공제(총급여 구간별 70~2%, 최대 2,000만 원)</li>
      <li><b>과세표준</b> = 근로소득금액 − 인적공제(1명 150만 원, 70세 이상 100만 원 더) − 국민연금 − 건강·고용보험 − 신용카드 등 소득공제</li>
      <li><b>산출세액</b> = 과세표준 × 세율(6~45%, 1,400만 원 이하 6%·5,000만 원 이하 15%·8,800만 원 이하 24%…) − 누진공제</li>
      <li><b>결정세액</b> = 산출세액 − 세액공제(근로소득·자녀·연금저축·월세·결혼 등)</li>
      <li><b>환급/추가 납부</b> = 이미 낸 세금(원천징수) − 결정세액. 지방소득세는 소득세의 10%</li></ol></section>
    <section><h2>{YE_YEAR}년에 달라진 점</h2><ul>
      <li><b>신용카드 공제 한도</b>: 기본 한도(총급여 7천만 원 이하 300만 원)에 자녀 1명당 50만 원, 최대 100만 원 더(7천만 원 초과는 25만 원, 최대 50만 원).</li>
      <li><b>월세 세액공제</b>: 주소가 다른 부부도 각각 받을 수 있어요(부부 합산 연 1,000만 원).</li>
      <li><b>자녀세액공제</b>: 대상이 만 {KIDS_AGE}세 이상 자녀로 바뀌었어요(아동수당 확대에 맞춰 해마다 1살씩 올라 2030년 13세). 첫째 25만·둘째 30만·셋째부터 1명당 40만 원 → 2명이면 {won(childCredit(2))}.</li>
      <li><b>결혼세액공제</b>: 2024~2026년에 혼인신고하면 1명 50만 원(생애 1회).</li></ul></section>
    <section><h2>세금 줄이는 순서(확인할 것)</h2><ul>
      <li>국세청 홈택스 <b>연말정산 간소화 서비스</b>(보통 1월 15일 열림)에서 카드·의료비·교육비 자료를 내려받아요.</li>
      <li>총급여의 25%를 넘게 쓴 다음부터는 신용카드(15%)보다 체크카드·현금영수증(30%)이 공제가 2배예요.</li>
      <li>연금저축·IRP는 연 900만 원까지 15%(총급여 5,500만 원 초과 12%)를 세금에서 바로 빼 줘요.</li>
      <li>부양가족은 한 사람만 공제받을 수 있어요. 맞벌이는 누가 받는 게 유리한지 각자 넣어 비교해 보세요.</li></ul></section>
  </>;
  if(slug==='wage')return <>
    <section><h2>{YEAR}년 최저임금으로 계산하면</h2>
      <T head={['1주 일하는 시간','주휴수당(1주)','월급(주휴 포함)']} rows={[[ '40시간',won(w40.holidayPay),won(w40.month)],['20시간',won(w20.holidayPay),won(w20.month)],['15시간',won(w15.holidayPay),won(w15.month)],['14시간',won(w14.holidayPay)+' (대상 아님)',won(w14.month)]]}/>
      <p className="muted small">시간급 {MIN_WAGE.toLocaleString('ko-KR')}원({MIN_WAGES[YEAR].notice}, {YEAR}.1.1~12.31). 월급은 한 달을 365÷12÷7주로 계산(주 40시간이면 209시간).</p></section>
    <section><h2>계산 방법</h2><ul>
      <li><b>주휴시간</b> = 1주 일하는 시간 ÷ 40 × 8시간(40시간 넘으면 8시간). 1주 소정근로시간이 15시간 이상이고 그 주를 개근했을 때 받아요.</li>
      <li><b>주급</b> = (1주 일하는 시간 + 주휴시간) × 시급</li>
      <li><b>월급</b> = (1주 일하는 시간 + 주휴시간) × 약 4.345주 × 시급</li></ul></section>
  </>;
  if(slug==='severance'){const s=severance(9_000_000,92,365*3);return <>
    <section><h2>예시</h2><p>퇴직 전 3개월 임금 총액 900만 원(92일)·3년 일했다면 1일 평균임금 {won(s.daily)} → 퇴직금 약 <b>{won(s.amount)}</b>.</p></section>
    <section><h2>계산 방법</h2><ul>
      <li><b>1일 평균임금</b> = 퇴직 전 3개월 임금 총액 ÷ 그 3개월의 총 날수</li>
      <li><b>퇴직금</b> = 1일 평균임금 × 30일 × (재직일수 ÷ 365)</li>
      <li>1년 이상 계속 일했고, 4주 평균 1주 15시간 이상 일했을 때 받아요. 평균임금이 통상임금보다 적으면 통상임금으로 계산해요.</li>
      <li>상여금·연차수당은 정해진 비율만큼만 3개월 임금에 더해요. 정확한 금액은 회사·고용노동부 퇴직금 계산과 다를 수 있어요.</li></ul></section>
  </>;}
  if(slug==='unemployment'){const u=unemployment(100_000,8,3,false);return <>
    <section><h2>받는 날수(고용보험법 별표 1)</h2>
      <T head={['고용보험 가입 기간','50세 미만','50세 이상·장애인']} rows={[['1년 미만',uiDays(0,false)+'일',uiDays(0,true)+'일'],['1년 이상~3년 미만',uiDays(1,false)+'일',uiDays(1,true)+'일'],['3년 이상~5년 미만',uiDays(3,false)+'일',uiDays(3,true)+'일'],['5년 이상~10년 미만',uiDays(5,false)+'일',uiDays(5,true)+'일'],['10년 이상',uiDays(10,false)+'일',uiDays(10,true)+'일']]}/></section>
    <section><h2>하루 금액</h2><ul>
      <li><b>1일 구직급여</b> = 이직 전 1일 평균임금 × 60%</li>
      <li><b>하한</b> = 최저임금 × 80% × 1일 소정근로시간 → 8시간이면 {won(floor8)}</li>
      <li><b>상한</b> = {won(UI_MAX)}({UI_YEAR}.1.1 이후 이직자)</li>
      <li>예: 1일 평균임금 10만 원·8시간·가입 3년·50세 미만 → 하루 {won(u.daily)} × {u.days}일 = 약 <b>{won(u.total)}</b></li></ul>
      <p className="muted small">비자발적으로 이직했고, 이직 전 18개월 동안 고용보험 가입 180일 이상 등 조건을 채워야 받아요. 자격 판단은 <a href="/center">관할 고용센터</a>에서 해요.</p></section>
  </>;}
  const i=insurance(w40.month);return <>
    <section><h2>최저임금 월급({won(w40.month)})이면</h2>
      <T head={['항목','근로자 부담']} rows={[['국민연금',won(i.pension)],['건강보험',won(i.health)],['장기요양',won(i.ltc)],['고용보험',won(i.employ)],['합계',won(i.total)]]}/>
      <p className="muted small">보험료는 10원 미만 버림. 국민연금 기준소득월액 상·하한·비과세 수당·소득세는 반영하지 않은 어림값이에요.</p></section>
    <section><h2>요율({RATE_YEAR}년 근로자 부담)</h2><ul>
      <li>국민연금 {(RATES.pension*100).toFixed(2)}%(보험료율 9.5%의 절반)</li><li>건강보험 {(RATES.health*100).toFixed(3)}%(7.19%의 절반)</li>
      <li>장기요양 = 건강보험료 × {(RATES.ltc*100).toFixed(2)}%</li><li>고용보험(실업급여) {(RATES.employ*100).toFixed(1)}%</li></ul></section>
  </>;
}
export function faqOf(slug:Slug):[string,string][]{
  if(slug==='yearend'){const [a,b]=[YE_EX[1],YE_EX[2]];return [
    [`연봉 4천만 원이면 연말정산 세금은 얼마인가요?`,`혼자 살고 카드를 총급여의 30% 썼다고 가정하면 결정세액은 지방소득세 포함 약 ${won(a.r.total)}입니다. 이미 원천징수로 낸 세금이 이보다 많으면 그만큼 돌려받습니다.`],
    [`연봉 5천만 원이면 연말정산 세금은 얼마인가요?`,`같은 가정에서 지방소득세 포함 약 ${won(b.r.total)}입니다. 부양가족·자녀·연금저축·월세가 있으면 더 줄어듭니다.`],
    ['신용카드 소득공제는 얼마부터 되나요?','총급여의 25%를 넘게 쓴 금액부터 공제됩니다. 넘은 부분 중 신용카드는 15%, 체크카드·현금영수증은 30%, 전통시장·대중교통은 40%입니다.'],
    [`${YE_YEAR}년 자녀세액공제는 얼마인가요?`,`만 ${KIDS_AGE}세 이상 자녀 기준(${YE_YEAR}년 귀속) 첫째 25만 원, 둘째 30만 원, 셋째부터 1명당 40만 원입니다. 2명이면 ${won(childCredit(2))}입니다.`]];}
  if(slug==='wage')return [[`${YEAR}년 최저임금은 얼마인가요?`,`시간급 ${MIN_WAGE.toLocaleString('ko-KR')}원입니다. 주 40시간 일하면 주휴수당을 포함한 월급(209시간)은 ${won(w40.month)}입니다.`],
    ['주휴수당은 언제 받나요?','1주 소정근로시간이 15시간 이상이고 그 주에 정해진 날을 모두 일했을 때, 1주 일하는 시간 ÷ 40 × 8시간만큼 받습니다(최대 8시간).'],
    [`주 20시간 일하면 주휴수당은 얼마인가요?`,`${YEAR}년 최저임금 기준 주휴 4시간, ${won(w20.holidayPay)}입니다.`]];
  if(slug==='severance')return [['퇴직금은 어떻게 계산하나요?','1일 평균임금 × 30일 × 재직일수 ÷ 365입니다. 1일 평균임금은 퇴직 전 3개월 임금 총액을 그 3개월의 날수로 나눈 금액입니다.'],
    ['1년이 안 되면 퇴직금이 없나요?','네. 계속 근로기간이 1년 이상이고 4주 평균 1주 15시간 이상 일한 경우에 받습니다.']];
  if(slug==='unemployment')return [[`${YEAR}년 실업급여 하루 최대 금액은?`,`1일 상한 ${won(UI_MAX)}(${UI_YEAR}.1.1 이후 이직자 기준)입니다. 하한은 최저임금의 80% × 1일 소정근로시간으로, 8시간이면 ${won(floor8)}입니다.`],
    ['실업급여는 며칠 받나요?','고용보험 가입 기간과 나이에 따라 120~270일입니다. 50세 미만은 120~240일, 50세 이상·장애인은 120~270일입니다.'],
    ['실업급여는 어디서 신청하나요?','고용24에서 구직 신청을 한 뒤 주민등록 주소지를 관할하는 고용센터에서 신청합니다.']];
  return [[`${RATE_YEAR}년 4대보험 근로자 부담률은?`,`국민연금 ${(RATES.pension*100).toFixed(2)}%, 건강보험 ${(RATES.health*100).toFixed(3)}%, 장기요양은 건강보험료의 ${(RATES.ltc*100).toFixed(2)}%, 고용보험 ${(RATES.employ*100).toFixed(1)}%입니다.`],
    [`최저임금 월급에서 4대보험은 얼마인가요?`,`월 ${won(w40.month)} 기준 약 ${won(i0.total)}이 빠집니다(소득세 제외).`]];
}
const i0=insurance(w40.month);
export const YE_SOURCE=<p className="jb-note">참고용 어림 계산이에요. 실제 세금은 회사 연말정산·국세청 계산과 다를 수 있어요. 기준: 소득세법(세율·근로소득공제·근로소득세액공제·자녀세액공제)·조세특례제한법(신용카드·월세·결혼세액공제), {YE_YEAR}년 귀속(확인 {YE_CHECKED}). 근로소득공제 1,500만 원 = {won(earnedDeduction(15e6))}, 과세표준 5,000만 원의 산출세액 = {won(taxOf(5e7))}. 정확한 계산은 <a href="https://www.hometax.go.kr" rel="noopener" target="_blank">국세청 홈택스</a> '연말정산 미리보기'에서 확인하세요. 입력한 숫자는 이 휴대폰 안에서만 계산하고 어디에도 보내지 않아요.</p>;
export const SOURCE=<p className="jb-note">참고용 어림 계산이에요. 실제 금액은 회사·고용센터·공단 계산과 다를 수 있어요. 기준: {YEAR}년 최저임금({MIN_WAGES[YEAR].notice})·고용보험법(구직급여 상한 {UI_YEAR}년)·{RATE_YEAR}년 4대보험 요율(확인 {CHECKED}). 정확한 계산은 <a href="https://www.work24.go.kr" rel="noopener" target="_blank">고용24</a>·<a href="https://www.4insure.or.kr/pbiz/main/main.do" rel="noopener" target="_blank">4대사회보험 정보연계센터</a>에서 확인하세요. 입력한 숫자는 이 휴대폰 안에서만 계산하고 어디에도 보내지 않아요.</p>;
