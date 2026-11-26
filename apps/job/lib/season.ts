// 노인일자리 신청 시즌(11/26 요청서 — 매년 12~1월 모집으로 검색이 몰림). 해마다 이 파일의 숫자·날짜·출처만 바꾸고 주소는 /season/senior-{연도}.
// 사실은 보건복지부 발표를 전한 보도(2026-11-26 오마이뉴스·헤럴드경제)로 확인한 것만. 모르는 것(유형별 인원·활동비)은 적지 않음.
export const SENIOR={
  year:2027,
  slug:'senior-2027',
  total:'118만 개',
  start:'2026-11-27',end:'2026-12-24',
  notice:'2026년 12월 중순부터 2027년 1월 초까지, 접수한 기관이 한 사람씩 알려 줘요',
  types:[
    ['노인공익활동사업','기초연금을 받는 65세 이상'],
    ['노인역량활용사업','65세 이상(일부 사업은 60세 이상)'],
    ['공동체사업단','60세 이상'],
  ] as [string,string][],
  select:'소득 수준·활동 역량·경력 등을 합한 점수가 높은 순',
  phone:'1544-3388',
  checked:'2026-11-26',
  source:'보건복지부 발표(2026년 11월 26일 보도 — 오마이뉴스·헤럴드경제)',
};
export const seniorPath=`/season/${SENIOR.slug}`;
/** 빌드한 날(한국 날짜)이 모집 기간 안이거나 그 전 2주 안이면 띠를 보여 줌 — 일자리 사이트는 매일 다시 빌드. */
const today=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
export const seniorOn=today<=SENIOR.end&&Date.parse(SENIOR.start)-Date.parse(today)<=14*864e5;
const md=(d:string)=>`${Number(d.slice(5,7))}월 ${Number(d.slice(8,10))}일`;
export const seniorSpan=`${md(SENIOR.start)}~${md(SENIOR.end)}`;
