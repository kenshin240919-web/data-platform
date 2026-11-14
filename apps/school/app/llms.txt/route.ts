import {KIND_LABEL,KIND_ORDER,kindCount,regions,schools,sidos,SITE,updated} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내 학교 (school.guidejung.com)\n\n> 우리 학교 오늘 급식, 이번 주 급식(알레르기 유발 식품 표시), 시험·방학 등 학사일정 D-day, 학년·반 시간표를 보여 주는 서비스입니다. 출처는 나이스(NEIS) 교육정보 개방 포털(학교기본정보·급식식단정보·학사일정·학급정보·시간표)입니다.\n\n## 주요 페이지\n- [지역별 학교](https://school.guidejung.com/region): 시도·시군구별 초·중·고등학교·특수학교 목록\n- 시군구 페이지 `/region/{시군구코드}` 예: https://school.guidejung.com/region/11680 (서울 강남구)\n- 학교 상세 `/school/{나이스 학교코드}` 예: https://school.guidejung.com/school/7091427 (대치중학교): 오늘 급식·이번 주 급식·알레르기·학사일정 D-day·시간표·학교 정보\n\n## 데이터 안내\n- 급식·학사일정·시간표는 학교가 나이스에 입력한 내용이며, 학교 페이지를 열 때 나이스에서 받아 몇 시간 동안 보관합니다.\n- 급식 메뉴 뒤 숫자는 알레르기 유발 식품 번호(1 난류, 2 우유, 3 메밀, 4 땅콩, 5 대두, 6 밀, 7 고등어, 8 게, 9 새우, 10 돼지고기, 11 복숭아, 12 토마토, 13 아황산류, 14 호두, 15 닭고기, 16 쇠고기, 17 오징어, 18 조개류, 19 잣)입니다.";
function numbers():string[]{
  const top=[...regions].sort((a,b)=>b.count-a.count).slice(0,15);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전국 학교 ${n(schools.length)}곳(시군구 ${n(regions.length)}곳): ${KIND_ORDER.filter(k=>kindCount[k]).map(k=>`${KIND_LABEL[k]} ${n(kindCount[k])}`).join(' · ')}`,
    `- 시도별: ${sidos.map(s=>`${s.name} ${n(s.count)}`).join(' · ')}`,
    '- 학교마다 오늘 급식·이번 주 급식·학사일정·학년별 시간표는 방문할 때 나이스에서 받아 보여 줍니다(주소 /school/{학교코드}).',
    '','## 학교가 많은 시군구 15곳',...top.map(r=>`- [${r.name} 학교](${SITE}/region/${r.id}): ${n(r.count)}곳(${KIND_ORDER.filter(k=>r.kinds[k]).map(k=>`${KIND_LABEL[k]} ${n(r.kinds[k])}`).join(' · ')})`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
