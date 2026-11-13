// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 lib/calc.ts·yearend.ts로 채움(11/14 — 시장 방식).
import {MIN_WAGES,MIN_WAGE,UI_MAX,UI_YEAR,wage,won,YEAR} from '../../lib/calc';
import {KIDS_AGE,YE_YEAR} from '../../lib/yearend';
import {CASE_ORDER,CASES,PAYS,scenarios} from '../../lib/yearendPages';
import {SITE} from '../../lib/fmt';
export const dynamic='force-static';
const HEAD="# 내근처 일자리 (job.guidejung.com)\n\n> 일자리를 찾을 때 찾아가는 곳을 가까운 순으로 보여 주는 서비스입니다: 시군구별 관할 고용센터(고용복지플러스센터 — 실업급여·국민취업지원제도 신청), 지자체에 등록된 유료·무료 직업소개소(인력사무소·간병·가사 도우미 등), 여성새로일하기센터, 노인일자리 수행기관, 대학일자리플러스센터, 국가자격(자격증) 시험장. 채용 공고는 싣지 않으며 일자리를 소개하지 않습니다. 출처는 고용노동부·행정안전부·성평등가족부·한국노인인력개발원·한국산업인력공단 공공데이터이며 매일 갱신합니다. 공공데이터로 만든 민간 안내 사이트로, 정부·지자체 공식 사이트가 아닙니다.\n\n## 주요 페이지\n- [시군구별 관할 고용센터](https://job.guidejung.com/center): 실업급여는 주민등록 주소지 관할 고용센터에서 신청\n- [내 주변 직업소개소](https://job.guidejung.com/agency): 인력·건설, 간병·요양, 가사·산후 도우미 소개소\n- [무료직업소개소](https://job.guidejung.com/free)\n- [여성새로일하기센터](https://job.guidejung.com/women)\n- [노인일자리 수행기관](https://job.guidejung.com/senior)\n- [대학일자리플러스센터](https://job.guidejung.com/campus)\n- [자격증 시험장(국가자격 시험장)](https://job.guidejung.com/exam)\n- [상황별 안내](https://job.guidejung.com/guide): 일을 그만뒀을 때·일당 일자리·경력단절·어르신·청년\n- [지역별](https://job.guidejung.com/region)\n- [일자리 계산기](https://job.guidejung.com/calc): 연말정산·시급·주휴수당·월급·실업급여·퇴직금·4대보험\n- [연말정산 계산기](https://job.guidejung.com/calc/yearend): 연봉별·맞벌이·월세·중도 퇴사·신입 예시\n- [자격증 시험 일정](https://job.guidejung.com/schedule)\n\n## 데이터\n- 고용노동부 고용복지플러스센터 현황(관할구역), 대학일자리플러스센터 운영 현황\n- 행정안전부 유료직업소개소·무료직업소개소 조회서비스(지자체 인허가, 영업 중)\n- 성평등가족부 여성새로일하기센터 현황\n- 한국노인인력개발원 자립형일자리 수행기관 정보\n- 한국산업인력공단 국가자격시험 시험장소 정보";
export function GET(){
  const w=wage(MIN_WAGE,40);
  const lines=[HEAD,'',`## 숫자로 보기`,
    ...Object.keys(MIN_WAGES).map(Number).map(y=>{const m=MIN_WAGES[y],x=wage(m.hourly,40);return `- ${y}년 최저임금 시간급 ${won(m.hourly)}, 주 40시간 월급(209시간) ${won(x.month)} — ${m.notice} ([보기](${SITE}/calc/minimum-wage/${y}))`;}),
    `- ${YEAR}년 주휴수당: 1주 15시간 이상 개근 시 (1주 시간 ÷ 40 × 8)시간분, 주 40시간이면 1주 ${won(w.holidayPay)}`,
    `- 구직급여(실업급여) 1일 상한 ${won(UI_MAX)}(${UI_YEAR}.1.1 이후 이직자), 하한은 최저임금의 80% × 1일 소정근로시간, 받는 날수 120~270일`,
    `- ${YE_YEAR}년 귀속 자녀세액공제: 만 ${KIDS_AGE}세 이상 자녀 첫째 25만·둘째 30만·셋째부터 1명당 40만 원`,
    '',`## ${YE_YEAR}년 귀속 연말정산 연봉별 어림(혼자, 카드 총급여의 30%, 지방소득세 포함)`,
    ...PAYS.filter(p=>p%1000===0||p===2500).map(p=>`- [연봉 ${p.toLocaleString('ko-KR')}만 원](${SITE}/calc/yearend/${p}): 내야 할 세금 약 ${won(scenarios(p*1e4).base.total)}`),
    '',`## 연말정산 상황별`,...CASE_ORDER.map(k=>`- [${CASES[k].short}](${SITE}/calc/yearend/${k}): ${CASES[k].h1}`),''];
  return new Response(lines.join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
