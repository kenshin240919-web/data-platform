import {docs,KIND_ORDER,KINDS,nation,places,regions,sidos,SITE,updated} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 서류 (minwon.guidejung.com)\n\n> 내 주변 무인민원발급기(평일·주말·공휴일 운영 시간, 기계마다 뗄 수 있는 서류, 장애인 편의 기능), 주민센터·행정복지센터, 실시간 대기 인원을 알려 주는 시·구청 민원실, 여권 발급 기관, 우체국, 무인 프린트점을 가까운 순으로 보여 주는 서비스입니다. 출처는 행정안전부·한국지역정보개발원·우정사업본부·외교부 공공데이터이며 매일 갱신합니다. 공공데이터로 만든 민간 안내 사이트로, 정부·지자체 공식 사이트가 아닙니다.\n\n## 주요 페이지\n- [내 주변 무인민원발급기](https://minwon.guidejung.com/kiosk): 지금 운영 중인 발급기부터\n- [서류별로 찾기](https://minwon.guidejung.com/doc): 주민등록등본·가족관계증명서·건축물대장 등 서류를 뗄 수 있는 발급기\n- [주말·공휴일 발급기](https://minwon.guidejung.com/weekend)\n- [시·구청 민원실 실시간 대기](https://minwon.guidejung.com/cso)\n- [여권 발급 기관](https://minwon.guidejung.com/passport)\n- [우체국](https://minwon.guidejung.com/post)\n- [무인 프린트](https://minwon.guidejung.com/print)\n- [지역별](https://minwon.guidejung.com/region)\n\n## 데이터\n- 행정안전부 무인민원발급기 정보, 읍면동 하부행정기관 현황\n- 행정안전부·한국지역정보개발원 민원실 이용 현황 실시간 정보\n- 우정사업본부 우체국 정보, 외교부 여권사무대행기관 정보\n- 무인 프린트점은 카카오 로컬·NAVER API HUB 지역 검색을 방문 때마다 실시간 조회(저장 안 함)";
function numbers():string[]{
  const top=[...regions].sort((a,b)=>b.kinds.kiosk-a.kinds.kiosk).slice(0,15);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전체 ${n(places.length)}곳: ${KIND_ORDER.map(k=>`${KINDS[k].label} ${n(nation.kinds[k])}`).join(' · ')}`,
    `- 서류 안내 페이지 ${n(docs.length)}종(주소 /doc/{서류})`,
    `- 시도별: ${sidos.map(s=>`${s.name} ${n(s.count)}`).join(' · ')}`,
    '','## 무인민원발급기가 많은 시군구 15곳',...top.map(r=>`- [${r.name}](${SITE}/region/${r.id}): 무인민원발급기 ${n(r.kinds.kiosk)}대, 주민센터 ${n(r.kinds.office)}곳`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
