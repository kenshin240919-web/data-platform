import {nation,regions,sidos,SITE,status,SUBJECTS,updated} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 학원 (academy.guidejung.com)\n\n> 우리 동네 학원·교습소와 교육청에 공개된 과정별 수강료를 지역·과목·학년별로 보여 주는 서비스입니다. 출처는 나이스(NEIS) 교육정보 개방 포털의 학원교습소정보이며 매일 갱신합니다.\n\n## 주요 페이지\n- [지역별 학원](https://academy.guidejung.com/region): 시도·시군구별 학원 수, 과목별 학원 수와 공개 수강료(최저·중앙값·최고)\n- 시군구 페이지 `/region/{시도-시군구}` 예: https://academy.guidejung.com/region/서울-강남구\n- 시군구×과목 페이지 `/region/{시도-시군구}/{과목}` 예: 수학(math)·영어(english)·국어(korean)·과학(science)·논술·독서(essay)·코딩(coding)·음악(music)·미술(art)·무용·댄스(dance)\n- 학원 상세 `/academy/{학원지정번호}`: 교습과정, 과정별 수강료, 정원, 주소, 개설일\n\n## 데이터 안내\n- 수강료는 학원이 교육청에 신고해 공개한 금액이며 기간(월·주 등) 표기가 없는 경우가 많습니다. 실제 수강료는 학원에 확인해야 합니다.\n- 금액이 공개된 학원은 전체의 약 5곳 중 1곳입니다.\n- 개인과외교습자는 싣지 않습니다.";
function numbers():string[]{
  const subs=Object.entries(nation as Record<string,{count:number;fees:{median:number}|null}>).filter(([k,v])=>SUBJECTS[k]&&v.count).sort((a,b)=>b[1].count-a[1].count);
  const top=[...regions].sort((a,b)=>b.count-a.count).slice(0,15);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전국 학원·교습소 ${n(status.count)}곳(시군구 ${n(regions.length)}곳), 수강료를 공개한 곳 ${n(status.with_fees)}곳`,
    `- 과목별(학원 수 · 공개 수강료 중앙값/월): ${subs.slice(0,10).map(([k,v])=>`${SUBJECTS[k]} ${n(v.count)}곳${v.fees?.median?` · ${n(v.fees.median)}원`:''}`).join(' / ')}`,
    `- 시도별: ${sidos.map(s=>`${s.name} ${n(s.count)}`).join(' · ')}`,
    '','## 학원이 많은 시군구 15곳',...top.map(r=>`- [${r.name} 학원](${SITE}/region/${r.id}): ${n(r.count)}곳, 수강료 공개 ${n(r.with_fees)}곳`),
    '','## 과목별 학원비 순위',...subs.slice(0,6).map(([k])=>`- [${SUBJECTS[k]} 학원비 시군구 순위](${SITE}/rank/${k})`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
