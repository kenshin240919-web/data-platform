// 일자리 계산기(11/3 사용자 요청) — 브라우저·정적 페이지 공용, 순수 함수만.
// 숫자는 2026년 기준. 해마다 1월 전에 바꿀 것(아래 '확인' 날짜와 출처를 같이 고침).
//  - 최저임금 시간급 10,320원: 고용노동부 고시 제2025-47호(2026.1.1~12.31 적용). 확인 2026-11-03.
//  - 구직급여 하한 = 최저임금 × 80% × 1일 소정근로시간(고용보험법 제46조) → 8시간이면 66,048원.
//  - 구직급여 상한 68,100원: 2026.1.1 이후 이직자부터(보도 기준, 고용24에서 최종 확인). 확인 2026-11-03.
//  - 소정급여일수: 고용보험법 별표 1(2019.10.1 시행).
//  - 4대보험 근로자 부담(2026): 국민연금 4.75%(보험료율 9.5%의 절반), 건강보험 3.595%(7.19%의 절반),
//    장기요양 = 건강보험료 × 13.14%, 고용보험 0.9%. 정리 자료 기준 — 공단 모의계산으로 확인 안내. 확인 2026-11-03.
//  - 2027년 최저임금 시간급 10,700원(380원·3.7% 인상): 2026.8.5 고용노동부 고시, 월 209시간 2,236,300원. 확인 2026-11-14.
/** 연도별 최저임금 — 1월 1일이 지난 뒤 빌드하면 자동으로 그해 값(일자리 사이트는 매일 수집 뒤 다시 빌드). 새 고시가 나오면 여기에 한 줄. */
export const MIN_WAGES:Record<number,{hourly:number;notice:string}>={2026:{hourly:10320,notice:'고용노동부 고시 제2025-47호'},2027:{hourly:10700,notice:'2026년 8월 5일 고용노동부 고시'}};
const KNOWN=Object.keys(MIN_WAGES).map(Number);
const KST_YEAR=new Date(Date.now()+9*3600e3).getUTCFullYear();
export const YEAR=Math.min(Math.max(KST_YEAR,Math.min(...KNOWN)),Math.max(...KNOWN));
export const MIN_WAGE=MIN_WAGES[YEAR].hourly;
/** 4대보험 요율·구직급여 상한은 아직 2026년 값만 확인 — 새해 값이 나오면 함께 바꿀 것. */
export const RATE_YEAR=2026;
export const UI_YEAR=2026;
export const UI_MAX=68100;
export const RATES={pension:0.0475,health:0.03595,ltc:0.1314,employ:0.009};
export const CHECKED='2026-11-03';

/** 주휴시간: 1주 소정근로 15시간 이상이면 (주 근로시간 ÷ 40 × 8), 40시간을 넘어도 8시간까지. */
export const holidayHours=(weekly:number)=>weekly<15?0:Math.min(weekly,40)/40*8;
/** 시급 → 주급·월급(주휴 포함). 한 달 = 365 ÷ 12 ÷ 7 주(약 4.345주), 주 40시간이면 209시간. */
export function wage(hourly:number,weekly:number){
  const hh=holidayHours(weekly);
  const monthHours=Math.round((weekly+hh)*365/12/7);
  return {holidayHours:hh,holidayPay:Math.round(hh*hourly),week:Math.round((weekly+hh)*hourly),monthHours,month:Math.round(monthHours*hourly),year:Math.round(monthHours*hourly)*12,belowMin:hourly<MIN_WAGE};
}
/** 퇴직금 = 1일 평균임금 × 30 × 재직일수 ÷ 365. 1일 평균임금 = 퇴직 전 3개월 임금 총액 ÷ 그 3개월의 날수. 1년 이상·주 15시간 이상일 때. */
export function severance(pay3m:number,days3m:number,serviceDays:number){
  const daily=days3m>0?pay3m/days3m:0;
  return {daily:Math.round(daily),eligible:serviceDays>=365,amount:serviceDays>=365?Math.round(daily*30*serviceDays/365):0};
}
/** 구직급여 소정급여일수(고용보험법 별표 1). years: 고용보험 가입 기간(년). older: 이직일 기준 50세 이상 또는 장애인. */
export function uiDays(years:number,older:boolean){
  const i=years<1?0:years<3?1:years<5?2:years<10?3:4;
  return (older?[120,180,210,240,270]:[120,150,180,210,240])[i];
}
/** 구직급여 1일 금액 = 이직 전 1일 평균임금 × 60%, 하한(최저임금 80% × 1일 소정근로시간)·상한 68,100원. */
export function unemployment(avgDaily:number,dayHours:number,years:number,older:boolean){
  const floor=Math.round(MIN_WAGE*0.8*Math.min(8,Math.max(1,dayHours)));
  // 하한이 상한보다 크면(최저임금이 오른 해에 상한 발표 전) 하한을 그대로 씀.
  const raw=avgDaily*0.6;const daily=Math.round(Math.max(floor,Math.min(UI_MAX,raw)));
  const days=uiDays(years,older);
  return {raw:Math.round(raw),floor,daily,days,total:daily*days,capped:raw>UI_MAX,floored:raw<floor};
}
const cut10=(v:number)=>Math.floor(v/10)*10;
/** 4대보험 근로자 부담(월). 보험료는 10원 미만 버림. 국민연금 기준소득월액 상·하한·비과세 수당은 반영하지 않은 어림값. */
export function insurance(month:number){
  const pension=cut10(month*RATES.pension),health=cut10(month*RATES.health),ltc=cut10(health*RATES.ltc),employ=cut10(month*RATES.employ);
  const total=pension+health+ltc+employ;
  return {pension,health,ltc,employ,total,after:month-total};
}
export const won=(v:number)=>`${Math.round(v).toLocaleString('ko-KR')}원`;
