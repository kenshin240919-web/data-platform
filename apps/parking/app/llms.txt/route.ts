import {lots,nation,regions,sidos,SITE,updated} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(시장·고속도로와 같은 방식, ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 주차장 (parking.guidejung.com)\n\n> 내 주변 공영·무료 주차장을 가까운 순으로 보여 주고, 주차 시간(30분·1시간·2시간·4시간)별 예상 요금으로 싼 곳을 찾게 해 주는 서비스입니다. 출처는 전국주차장정보표준데이터(공공데이터포털, 각 지자체 등록)이며 매일 갱신합니다. 대부분 공영 주차장이고 민간 건물·상가 주차장은 거의 없습니다.\n\n## 주요 페이지\n- [지역별 주차장](https://parking.guidejung.com/region): 시도·시군구별 주차장 수\n- 시군구 페이지 `/region/{시군구코드}` 예: https://parking.guidejung.com/region/11680 (서울 강남구) — 무료·24시간 수, 유료 1시간 요금 중앙값\n- 조건 페이지 `/region/{시군구코드}/free`(무료)·`/allday`(24시간)\n- 주차장 상세 `/parking/{주차장관리번호}`: 요금표, 시간별 예상 요금, 평일·토요일·공휴일 운영 시간, 주차면 수, 관리기관\n\n## 데이터 안내\n- 예상 요금 = 기본 요금 + 기본 시간을 넘은 만큼 추가 단위 요금(올림), 1일 주차권이 있으면 그 이하. 할인·시간대별 요금은 반영하지 않습니다.\n- 요금·운영 시간은 지자체 등록 정보로 현장과 다를 수 있습니다.";
function numbers():string[]{
  const top=[...regions].sort((a,b)=>b.count-a.count).slice(0,15);
  const free=[...regions].sort((a,b)=>b.cond.free-a.cond.free).slice(0,10);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전국 공영·무료 주차장 ${n(lots.length)}곳(시군구 ${n(regions.length)}곳), 주차면 합계 ${n(nation.spaces)}면`,
    `- 무료 ${n(nation.free)}곳, 유료 ${n(nation.paid)}곳${nation.hour?`(유료 1시간 예상 요금 중앙값 ${n(nation.hour)}원)`:''}`,
    `- 시도별 주차장: ${sidos.map(s=>`${s.name} ${n(s.count)}`).join(' · ')}`,
    '','## 주차장이 많은 시군구 15곳',...top.map(r=>`- [${r.name} 주차장](${SITE}/region/${r.id}): ${n(r.count)}곳, 무료 ${n(r.cond.free)}곳${r.hour?`, 1시간 중앙값 ${n(r.hour)}원`:''}`),
    '','## 무료 주차장이 많은 시군구 10곳',...free.map(r=>`- [${r.name} 무료 주차장](${SITE}/region/${r.id}/free): ${n(r.cond.free)}곳`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
