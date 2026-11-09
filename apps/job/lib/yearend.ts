// 연말정산 어림 계산(11/9 사용자 '이번 주 할 일 3번' — 일자리 사이트에서 RPM이 가장 높아 방문을 늘릴 거리).
// 2026년 귀속(2027년 1~2월 연말정산) 기준. 해마다 12월 전에 숫자·출처를 같이 고칠 것. 확인 2026-11-09.
//  - 세율(소득세법 제55조) 6~45% 8단계, 근로소득공제(제47조, 한도 2,000만 원), 근로소득세액공제(제59조, 총급여별 한도 74·66·50·20만 원)
//    — 국세청 안내·해설 자료 기준(최근 개정 없음으로 확인, 국회 개정 여부는 국세청 최종 안내로 다시 확인).
//  - 자녀세액공제(제59조의2) 2025년 소득분부터 첫째 25만·둘째 30만·셋째 이상 1명당 40만 원(8세 이상 자녀).
//  - 신용카드 등 소득공제(조특법 제126조의2): 문턱 총급여 25%, 신용카드 15%·체크카드·현금영수증 30%·전통시장·대중교통 40%,
//    기본 한도 300만(총급여 7천만 원 초과 250만) + 2026년부터 자녀(손자녀 포함) 1명당 50만 원(최대 100만, 7천만 원 초과 25만·최대 50만),
//    전통시장·대중교통 추가 한도 300만(7천만 원 초과 200만) — 2025.12.2 국회 의결 보도 기준.
//  - 연금저축·IRP(제59조의3): 납입 900만 원까지, 총급여 5,500만 원 이하 15%·초과 12%.
//  - 월세(조특법 제95조의2): 총급여 8천만 원 이하 무주택 세대주 등, 연 1,000만 원까지, 5,500만 원 이하 17%·초과 15%.
//  - 결혼세액공제(조특법 제92조): 2024~2026년 혼인신고, 1명 50만 원(생애 1회).
//  - 표준세액공제 13만 원: 특별소득·특별세액·월세 세액공제를 신청하지 않을 때 → 두 방식 중 세금이 적은 쪽을 보여 줌.
// 의료비·교육비·보험료·기부금·주택자금·청약 등은 넣지 않은 어림값(화면에 안내).
export const YE_YEAR=2026;
export const YE_CHECKED='2026-11-09';
const BRACKETS:[number,number,number][]=[[14e6,0.06,0],[50e6,0.15,1.26e6],[88e6,0.24,5.76e6],[150e6,0.35,15.44e6],[300e6,0.38,19.94e6],[500e6,0.40,25.94e6],[1e9,0.42,35.94e6],[Infinity,0.45,65.94e6]];
export const taxOf=(base:number)=>{if(base<=0)return 0;const [,r,d]=BRACKETS.find(([top])=>base<=top)!;return Math.max(0,base*r-d);};
export function earnedDeduction(g:number){
  const v=g<=5e6?g*0.7:g<=15e6?3.5e6+(g-5e6)*0.4:g<=45e6?7.5e6+(g-15e6)*0.15:g<=1e8?12e6+(g-45e6)*0.05:14.75e6+(g-1e8)*0.02;
  return Math.min(20e6,v);
}
export function earnedCredit(calc:number,g:number){
  const raw=calc<=1.3e6?calc*0.55:715000+(calc-1.3e6)*0.3;
  const cap=g<=33e6?740000:g<=70e6?Math.max(660000,740000-(g-33e6)*0.008):g<=120e6?Math.max(500000,660000-(g-70e6)/2):Math.max(200000,500000-(g-120e6)/2);
  return Math.min(raw,cap);
}
export const childCredit=(n:number)=>n<=0?0:n===1?250000:n===2?550000:550000+(n-2)*400000;
/** 신용카드 등 소득공제: 문턱(총급여 25%)은 공제율이 낮은 것부터 채움. */
export function cardDeduction(g:number,credit:number,debit:number,special:number,kids:number){
  let th=g*0.25;const use=(v:number)=>{const t=Math.min(th,v);th-=t;return v-t;};
  const c=use(credit),d=use(debit),s=use(special);
  const basicCap=(g<=70e6?3e6:2.5e6)+Math.min(kids,2)*(g<=70e6?500000:250000);
  const normal=c*0.15+d*0.30,extra=s*0.40;
  const basic=Math.min(basicCap,normal+extra);
  const over=Math.max(0,normal+extra-basicCap);
  const add=Math.min(g<=70e6?3e6:2e6,Math.min(over,extra));
  return {deduction:Math.round(basic+add),threshold:Math.round(g*0.25),used:credit+debit+special};
}
export type YeIn={gross:number;insurance:number;pension:number;people:number;elder:number;kids8:number;credit:number;debit:number;special:number;pensionSave:number;rent:number;married:boolean;paid:number|null};
export function yearEnd(i:YeIn){
  const g=Math.max(0,i.gross);
  const earned=Math.round(earnedDeduction(g));
  const income=g-earned;
  const personal=Math.max(1,i.people)*1.5e6+i.elder*1e6;
  const card=cardDeduction(g,i.credit,i.debit,i.special,i.kids8);
  const common=personal+i.pension+card.deduction;
  const run=(special:boolean)=>{
    const base=Math.max(0,income-common-(special?i.insurance:0));
    const calc=Math.round(taxOf(base));
    const parts={earned:Math.round(earnedCredit(calc,g)),child:childCredit(i.kids8),pensionSave:Math.round(Math.min(9e6,i.pensionSave)*(g<=55e6?0.15:0.12)),
      rent:special&&g<=80e6?Math.round(Math.min(10e6,i.rent)*(g<=55e6?0.17:0.15)):0,married:i.married?500000:0,standard:special?0:130000};
    const credits=Object.values(parts).reduce((a,b)=>a+b,0);
    const tax=Math.max(0,calc-credits);
    return {base,calc,parts,credits:Math.min(credits,calc),tax:Math.floor(tax/10)*10};
  };
  const a=run(true),b=run(false);const best=b.tax<a.tax?{...b,standard:true}:{...a,standard:false};
  const local=Math.floor(best.tax*0.1/10)*10;
  const total=best.tax+local;
  // paid: 원천징수영수증의 기납부 소득세(지방소득세 빼고). 지방소득세는 소득세의 10%라 같은 비율로 어림.
  const refund=i.paid==null?null:(i.paid-best.tax)+(Math.floor(i.paid*0.1/10)*10-local);
  return {earned,income,personal,card,...best,local,total,refund};
}
