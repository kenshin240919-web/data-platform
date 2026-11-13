// 연말정산 연봉별·상황별 페이지(11/14 — 일자리 하루 조회 27 → 250 목표, 연말정산 검색은 12~1월 정점).
// 숫자는 모두 lib/yearend.ts yearEnd()로 계산 — 페이지마다 다른 실제 숫자가 들어가게(같은 문장 반복 금지).
import {insurance} from './calc';
import {yearEnd,type YeIn} from './yearend';

/** 연봉(총급여) 페이지: 2,500만~1억 원, 500만 원 단위(만 원). */
export const PAYS=Array.from({length:16},(_,i)=>2500+i*500);
export const man=(v:number)=>`${Math.round(v/1e4).toLocaleString('ko-KR')}만 원`;
export const wonR=(v:number)=>`${Math.round(v).toLocaleString('ko-KR')}원`;
/** 기본 가정: 혼자(인적공제 본인만), 4대보험은 calc.ts 요율로 어림, 카드는 총급여의 30%(신용카드 20%·체크카드 10%). */
export function ye(g:number,o:Partial<YeIn>={}){
  const i=insurance(g/12);
  return yearEnd({gross:g,insurance:(i.health+i.ltc+i.employ)*12,pension:i.pension*12,people:1,elder:0,kids:0,credit:g*0.2,debit:g*0.1,special:0,pensionSave:0,rent:0,married:false,paid:null,...o});
}
export type Scen={label:string;note:string;total:number;diff:number};
/** 연봉 페이지 표: 기본에서 하나씩 바꿨을 때 내야 할 세금(지방소득세 포함)과 차이. */
export function scenarios(g:number):{base:ReturnType<typeof ye>;rows:Scen[]}{
  const base=ye(g);const t0=base.total;
  const row=(label:string,note:string,o:Partial<YeIn>):Scen=>{const r=ye(g,o);return {label,note,total:r.total,diff:r.total-t0};};
  const rows=[
    row('카드를 모두 신용카드로','총급여의 30%를 신용카드만',{credit:g*0.3,debit:0}),
    row('전통시장·대중교통 200만 원 더','신용카드 사용 중 200만 원을 시장·교통으로',{credit:g*0.2-2e6,special:2e6}),
    row('연금저축·IRP 600만 원 넣기','',{pensionSave:6e6}),
    row('연금저축·IRP 900만 원 넣기','공제 한도 끝까지',{pensionSave:9e6}),
    ...(g<=8e7?[row('월세 60만 원(연 720만 원)','무주택 세대주 등 조건',{rent:7.2e6})]:[]),
    row('부모님 1명 부양가족 공제','만 60세 이상·연 소득 100만 원 이하',{people:2}),
    row('9세 이상 자녀 2명','인적공제 2명 + 자녀세액공제',{people:3,kids:2}),
    row('2026년에 혼인신고','결혼세액공제 50만 원(생애 1회)',{married:true}),
  ];
  return {base,rows};
}

export type Case='couple'|'rent'|'quit'|'first'|'tips';
export const CASES:Record<Case,{icon:string;title:string;h1:string;short:string;desc:string}>={
  couple:{icon:'👫',short:'맞벌이',title:'맞벌이 부부 연말정산 — 자녀·카드 누구에게 몰아야 세금이 줄까',h1:'맞벌이 연말정산, 누구에게 몰아야 할까',desc:''},
  rent:{icon:'🏠',short:'월세 세액공제',title:'월세 세액공제 계산 — 연봉·월세별로 실제 줄어드는 세금',h1:'월세 세액공제, 내 연봉이면 얼마?',desc:''},
  quit:{icon:'🚪',short:'중도 퇴사자',title:'중도 퇴사자 연말정산 — 5월 종합소득세 신고로 더 돌려받기',h1:'중간에 퇴사했다면 연말정산은?',desc:''},
  first:{icon:'🌱',short:'신입·첫 연말정산',title:'신입사원 첫 연말정산 — 입사 달별로 세금이 얼마나 될까',h1:'첫 연말정산, 입사한 달에 따라 달라요',desc:''},
  tips:{icon:'💰',short:'13월의 월급 늘리는 법',title:'13월의 월급 늘리는 법 — 연봉 5,000만 원이 하나씩 해 보면',h1:'13월의 월급 늘리는 방법, 효과 큰 순서',desc:''},
};
export const CASE_ORDER:Case[]=['tips','couple','rent','first','quit'];

/** 맞벌이: 남편·아내 총급여와 9세 이상 자녀 2명, 가구 카드 사용액을 누구에게 둘지. */
export function couple(){
  // 두 사람 세율 구간이 같으면(예: 6천·4천 모두 15%) 누구에게 넣어도 같아 — 구간이 다른 예시로.
  const hi=8e7,lo=3.5e7,cards=2.4e7;
  const sum=(a:Partial<YeIn>,b:Partial<YeIn>)=>{const x=ye(hi,{credit:0,debit:0,...a}),y=ye(lo,{credit:0,debit:0,...b});return {hi:x.total,lo:y.total,sum:x.total+y.total};};
  const half={credit:cards/4,debit:cards/4};
  const kidsHi=sum({people:3,kids:2,...half},{...half});
  const kidsLo=sum({...half},{people:3,kids:2,...half});
  const cardHi=sum({people:3,kids:2,credit:cards/2,debit:cards/2},{});
  const cardLo=sum({people:3,kids:2},{credit:cards/2,debit:cards/2});
  return {hi,lo,cards,kidsHi,kidsLo,cardHi,cardLo};
}
/** 월세: 연봉·월세별로 '계산상 공제액'과 '실제로 줄어드는 세금'(세금이 적으면 다 못 받음). */
export function rentTable(){
  const pays=[2.5e7,3.5e7,4.5e7,5.5e7,6.5e7,8e7],rents=[4e5,6e5,8e5];
  return pays.map(g=>({g,rate:g<=5.5e7?17:15,cells:rents.map(m=>{const y=Math.min(1e7,m*12);const nominal=Math.round(y*(g<=5.5e7?0.17:0.15)*1.1);return {m,nominal,real:ye(g).total-ye(g,{rent:m*12}).total};})}));
}
/** 중도 퇴사: 연봉 4,800만 원, 6월 말 퇴사(총급여 2,400만 원). 회사 퇴사 정산(카드·연금저축 없이) vs 5월 종합소득세 신고(반영). */
export function quit(){
  const g=2.4e7;
  const company=ye(g,{credit:0,debit:0});
  const may=ye(g,{credit:4e6,debit:4e6,special:1e6,pensionSave:3e6});
  return {g,company:company.total,may:may.total,diff:company.total-may.total};
}
/** 첫 연말정산: 연봉 3,600만 원, 입사한 달별 총급여와 세금(카드는 입사 뒤 쓴 만큼 — 총급여의 30%). */
export function firstJob(){
  return [1,4,7,10].map(m=>{const g=3.6e7*(13-m)/12;const r=ye(g);return {m,g,total:r.total,card:r.card.deduction};});
}
/** 13월의 월급: 연봉 5,000만 원 혼자 기준, 하나씩 했을 때 줄어드는 세금(큰 순). */
export function tips(){
  const g=5e7;const {base,rows}=scenarios(g);
  // 자녀 수처럼 고를 수 없는 것은 빼고, 할 수 있는 것만.
  return {g,base:base.total,rows:rows.filter(r=>r.diff<0&&!r.label.includes('자녀')).sort((a,b)=>a.diff-b.diff)};
}
