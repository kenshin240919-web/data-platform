// 계산기 페이지 설명·예시·FAQ(정적 HTML — 검색엔진·AI 답변이 읽는 부분). 숫자는 lib/calc.ts에서 계산.
import {CHECKED,insurance,MIN_WAGE,RATES,severance,UI_MAX,unemployment,uiDays,wage,won,YEAR} from '../../lib/calc';
export type Slug='wage'|'severance'|'unemployment'|'insurance';
const w40=wage(MIN_WAGE,40),w20=wage(MIN_WAGE,20),w15=wage(MIN_WAGE,15),w14=wage(MIN_WAGE,14);
const floor8=Math.round(MIN_WAGE*0.8*8);
export const CALCS:Record<Slug,{icon:string;title:string;h1:string;desc:string;short:string}>={
  wage:{icon:'⏱️',title:`${YEAR} 시급·주휴수당·월급 계산기`,h1:'시급 → 주휴수당·월급 계산',short:'시급·주휴수당·월급',
    desc:`${YEAR}년 최저임금 시간급 ${MIN_WAGE.toLocaleString('ko-KR')}원 기준. 주 40시간이면 주휴 포함 월 209시간 ${won(w40.month)}. 시급과 1주 일하는 시간을 넣으면 주휴수당·주급·월급을 바로 계산해요.`},
  severance:{icon:'💼',title:'퇴직금 계산기 — 1일 평균임금 × 30 × 재직일수 ÷ 365',h1:'퇴직금 계산',short:'퇴직금',
    desc:'퇴직 전 3개월 임금 총액과 재직 기간을 넣으면 1일 평균임금과 퇴직금을 어림해요. 1년 이상·주 15시간 이상 일했을 때 받아요.'},
  unemployment:{icon:'🧾',title:`${YEAR} 실업급여(구직급여) 계산기 — 하루 얼마, 며칠?`,h1:'실업급여(구직급여) 계산',short:'실업급여',
    desc:`구직급여는 이직 전 1일 평균임금의 60%. ${YEAR}년 하한 ${won(floor8)}(8시간 기준)·상한 ${won(UI_MAX)}, 받는 날수 120~270일. 내 금액과 날수를 어림해요.`},
  insurance:{icon:'🧮',title:`${YEAR} 4대보험 계산기 — 월급에서 얼마 빠질까?`,h1:'4대보험 공제 계산',short:'4대보험 공제',
    desc:`${YEAR}년 근로자 부담: 국민연금 ${(RATES.pension*100).toFixed(2)}%·건강보험 ${(RATES.health*100).toFixed(3)}%·장기요양(건강보험료의 ${(RATES.ltc*100).toFixed(2)}%)·고용보험 ${(RATES.employ*100).toFixed(1)}%. 월급을 넣으면 4대보험 금액과 남는 금액을 계산해요.`},
};
export const ORDER:Slug[]=['wage','unemployment','severance','insurance'];
const T=({rows,head}:{rows:(string|number)[][];head:string[]})=><table className="jb-table"><thead><tr>{head.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table>;
export function Body({slug}:{slug:Slug}){
  if(slug==='wage')return <>
    <section><h2>{YEAR}년 최저임금으로 계산하면</h2>
      <T head={['1주 일하는 시간','주휴수당(1주)','월급(주휴 포함)']} rows={[[ '40시간',won(w40.holidayPay),won(w40.month)],['20시간',won(w20.holidayPay),won(w20.month)],['15시간',won(w15.holidayPay),won(w15.month)],['14시간',won(w14.holidayPay)+' (대상 아님)',won(w14.month)]]}/>
      <p className="muted small">시간급 {MIN_WAGE.toLocaleString('ko-KR')}원(고용노동부 고시 제2025-47호, {YEAR}.1.1~12.31). 월급은 한 달을 365÷12÷7주로 계산(주 40시간이면 209시간).</p></section>
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
      <li><b>상한</b> = {won(UI_MAX)}({YEAR}.1.1 이후 이직자)</li>
      <li>예: 1일 평균임금 10만 원·8시간·가입 3년·50세 미만 → 하루 {won(u.daily)} × {u.days}일 = 약 <b>{won(u.total)}</b></li></ul>
      <p className="muted small">비자발적으로 이직했고, 이직 전 18개월 동안 고용보험 가입 180일 이상 등 조건을 채워야 받아요. 자격 판단은 <a href="/center">관할 고용센터</a>에서 해요.</p></section>
  </>;}
  const i=insurance(w40.month);return <>
    <section><h2>최저임금 월급({won(w40.month)})이면</h2>
      <T head={['항목','근로자 부담']} rows={[['국민연금',won(i.pension)],['건강보험',won(i.health)],['장기요양',won(i.ltc)],['고용보험',won(i.employ)],['합계',won(i.total)]]}/>
      <p className="muted small">보험료는 10원 미만 버림. 국민연금 기준소득월액 상·하한·비과세 수당·소득세는 반영하지 않은 어림값이에요.</p></section>
    <section><h2>요율({YEAR}년 근로자 부담)</h2><ul>
      <li>국민연금 {(RATES.pension*100).toFixed(2)}%(보험료율 9.5%의 절반)</li><li>건강보험 {(RATES.health*100).toFixed(3)}%(7.19%의 절반)</li>
      <li>장기요양 = 건강보험료 × {(RATES.ltc*100).toFixed(2)}%</li><li>고용보험(실업급여) {(RATES.employ*100).toFixed(1)}%</li></ul></section>
  </>;
}
export function faqOf(slug:Slug):[string,string][]{
  if(slug==='wage')return [[`${YEAR}년 최저임금은 얼마인가요?`,`시간급 ${MIN_WAGE.toLocaleString('ko-KR')}원입니다. 주 40시간 일하면 주휴수당을 포함한 월급(209시간)은 ${won(w40.month)}입니다.`],
    ['주휴수당은 언제 받나요?','1주 소정근로시간이 15시간 이상이고 그 주에 정해진 날을 모두 일했을 때, 1주 일하는 시간 ÷ 40 × 8시간만큼 받습니다(최대 8시간).'],
    [`주 20시간 일하면 주휴수당은 얼마인가요?`,`${YEAR}년 최저임금 기준 주휴 4시간, ${won(w20.holidayPay)}입니다.`]];
  if(slug==='severance')return [['퇴직금은 어떻게 계산하나요?','1일 평균임금 × 30일 × 재직일수 ÷ 365입니다. 1일 평균임금은 퇴직 전 3개월 임금 총액을 그 3개월의 날수로 나눈 금액입니다.'],
    ['1년이 안 되면 퇴직금이 없나요?','네. 계속 근로기간이 1년 이상이고 4주 평균 1주 15시간 이상 일한 경우에 받습니다.']];
  if(slug==='unemployment')return [[`${YEAR}년 실업급여 하루 최대 금액은?`,`1일 상한 ${won(UI_MAX)}(${YEAR}.1.1 이후 이직자 기준)입니다. 하한은 최저임금의 80% × 1일 소정근로시간으로, 8시간이면 ${won(floor8)}입니다.`],
    ['실업급여는 며칠 받나요?','고용보험 가입 기간과 나이에 따라 120~270일입니다. 50세 미만은 120~240일, 50세 이상·장애인은 120~270일입니다.'],
    ['실업급여는 어디서 신청하나요?','고용24에서 구직 신청을 한 뒤 주민등록 주소지를 관할하는 고용센터에서 신청합니다.']];
  return [[`${YEAR}년 4대보험 근로자 부담률은?`,`국민연금 ${(RATES.pension*100).toFixed(2)}%, 건강보험 ${(RATES.health*100).toFixed(3)}%, 장기요양은 건강보험료의 ${(RATES.ltc*100).toFixed(2)}%, 고용보험 ${(RATES.employ*100).toFixed(1)}%입니다.`],
    [`최저임금 월급에서 4대보험은 얼마인가요?`,`월 ${won(w40.month)} 기준 약 ${won(i0.total)}이 빠집니다(소득세 제외).`]];
}
const i0=insurance(w40.month);
export const SOURCE=<p className="jb-note">참고용 어림 계산이에요. 실제 금액은 회사·고용센터·공단 계산과 다를 수 있어요. 기준: {YEAR}년 최저임금 고시(고용노동부 제2025-47호)·고용보험법·4대보험 요율(확인 {CHECKED}). 정확한 계산은 <a href="https://www.work24.go.kr" rel="noopener" target="_blank">고용24</a>·<a href="https://www.4insure.or.kr/pbiz/main/main.do" rel="noopener" target="_blank">4대사회보험 정보연계센터</a>에서 확인하세요. 입력한 숫자는 이 휴대폰 안에서만 계산하고 어디에도 보내지 않아요.</p>;
