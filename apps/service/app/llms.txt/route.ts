import {centers,KIND_ORDER,KINDS,nation,regions,sidos,SITE,updated} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(시장·고속도로와 같은 방식, ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 서비스센터 (service.guidejung.com)\n\n> 내 주변 자동차 정비소(종합·소형·전문·원동기 정비)와 자동차 검사소·세차장·배출가스 정비 업체를 가까운 순으로 보여 주고, 자동차 검사 기한·과태료 계산기와 정비 맡기기 전 체크리스트를 제공하는 서비스입니다. 출처는 공공데이터포털 전국자동차정비업체표준데이터·전국자동차검사소표준데이터와 지방행정 인허가데이터(세차장·배출가스 정비)이며 매일 갱신합니다.\n\n## 주요 페이지\n- [자동차 검사 기한·과태료 계산기](https://service.guidejung.com/inspection): 검사 기간 마지막 날로 남은 날·예상 과태료, 내 주변 검사소\n- [정비 맡기기 전 확인](https://service.guidejung.com/guide): 1급·2급·3급(종합·소형·전문) 정비소 차이, 견적서·부품 확인 체크리스트\n- [지역별](https://service.guidejung.com/region): 시군구 `/region/{시군구코드}`, 종류별 `/region/{코드}/repair|inspect|wash|emission`\n- 상세 `/center/{id}`: 주소·전화·정비 종류·영업 시간(등록된 곳만)·검사 종류·근처 다른 곳\n\n## 데이터 안내\n- 정비소는 영업 중으로 등록된 곳만(폐업·휴업 제외). 영업 시간은 약 3분의 1만 등록돼 있습니다.\n- 검사소는 지자체가 등록한 곳만이라 지역에 따라 빠진 곳이 있습니다.\n- 과태료는 '검사 기간 끝난 뒤 30일 이내 4만 원, 이후 3일마다 2만 원, 최대 60만 원' 안내 기준의 예상치입니다.\n- 가전·휴대폰 서비스센터(`/brand`, `/brand/{samsung|lg|coway|cuckoo|skmagic|winia|apple}`)는 공공 데이터가 없어 위치 목록 대신 공식 누리집에서 확인한 고객센터 번호·접수 방법만 안내합니다(확인일 표시).";
function numbers():string[]{
  const top=[...regions].sort((a,b)=>b.kinds.repair-a.kinds.repair).slice(0,15);
  const subs=Object.entries(nation.subs).sort((a,b)=>b[1]-a[1]);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전체 ${n(centers.length)}곳: ${KIND_ORDER.map(k=>`${KINDS[k].label} ${n(nation.kinds[k])}`).join(' · ')}`,
    `- 정비소 종류: ${subs.map(([k,v])=>`${k} ${n(v)}`).join(' · ')}`,
    `- 시도별: ${sidos.map(s=>`${s.name} ${n(s.count)}`).join(' · ')}`,
    '','## 정비소가 많은 시군구 15곳',...top.map(r=>`- [${r.name} 정비소](${SITE}/region/${r.id}): 정비소 ${n(r.kinds.repair)}곳`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
