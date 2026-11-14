import {CONDITIONS,pharmacies,regions,sidos,SITE,updated,nation} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(시장·고속도로와 같은 방식, ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 약국 (pharmacy.guidejung.com)\n\n> 내 주변 지금 문 연 약국을 가까운 순으로 보여 주고, 밤 10시 이후 심야·일요일·공휴일에 여는 약국을 지역(시군구)별로 정리한 서비스입니다. 출처는 국립중앙의료원 전국 약국 정보 조회 서비스(공공데이터포털)이며 매일 갱신합니다.\n\n## 주요 페이지\n- [지역별 약국](https://pharmacy.guidejung.com/region): 시도·시군구별 약국 수\n- 시군구 페이지 `/region/{시군구코드}` 예: https://pharmacy.guidejung.com/region/11680 (서울 강남구)\n- 조건 페이지 `/region/{시군구코드}/night`(심야)·`/sunday`(일요일)·`/holiday`(공휴일)\n- 약국 상세 `/pharmacy/{기관ID}`: 요일별·공휴일 운영 시간, 지금 영업 여부, 주소·전화, 근처 약국\n\n## 데이터 안내\n- 운영 시간은 약국이 신고한 요일별 시간입니다. 명절·임시 휴무는 다를 수 있어 방문 전 전화 확인을 권합니다.\n- '지금 영업 중'은 한국 시각과 요일별 시간으로 계산하며, 공휴일에는 공휴일 운영 시간만 봅니다.";
function numbers():string[]{
  const top=[...regions].sort((a,b)=>b.count-a.count).slice(0,15);
  const night=[...regions].sort((a,b)=>b.cond.night-a.cond.night).filter(r=>r.cond.night).slice(0,10);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전국 약국 ${n(pharmacies.length)}곳(시도 ${n(sidos.length)}곳·시군구 ${n(regions.length)}곳)`,
    `- ${(Object.keys(CONDITIONS) as (keyof typeof CONDITIONS)[]).map(k=>`${CONDITIONS[k].title} ${n(nation[k])}곳`).join(' · ')}`,
    `- 시도별 약국: ${sidos.map(s=>`${s.name} ${n(s.count)}`).join(' · ')}`,
    '','## 약국이 많은 시군구 15곳',...top.map(r=>`- [${r.name} 약국](${SITE}/region/${r.id}): ${n(r.count)}곳, 심야 ${n(r.cond.night)}곳`),
    '','## 밤 10시 이후 여는 약국이 많은 시군구 10곳',...night.map(r=>`- [${r.name} 심야 약국](${SITE}/region/${r.id}/night): ${n(r.cond.night)}곳`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
