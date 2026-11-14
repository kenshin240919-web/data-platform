import {BRAND_ORDER,BRANDS,meters,nation,regions,sidos,SITE,stores,updated} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(시장·고속도로와 같은 방식, ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 편의점 (cvs.guidejung.com)\n\n> 약국이 닫은 밤에도 해열진통제·소화제 같은 안전상비의약품을 살 수 있는 편의점·마트를 가까운 순으로 보여 주는 서비스입니다. 출처는 행정안전부 지방행정 인허가데이터(안전상비의약품 판매업소)이며, 시장·군수·구청장에게 판매자로 등록된 곳(영업 중)만 매일 갱신합니다. 약사법 제44조의2에 따라 판매자로 등록하려면 24시간 연중 무휴 점포를 갖춰야 합니다.\n\n## 주요 페이지\n- [상비약 안내](https://cvs.guidejung.com/medicine): 안전상비의약품이란, 판매자 등록·24시간 연중 무휴 기준, 밤에 아플 때 순서(약사법 원문 기준)\n- [붕어빵 파는 편의점](https://cvs.guidejung.com/bungeoppang): 내 위치 1.5km 안 붕어빵·군고구마 서비스를 등록한 GS25(GS25 앱 매장 정보를 방문 때 확인, 비공식·저장 안 함)\n- [반값택배 되는 편의점](https://cvs.guidejung.com/half-delivery): 내 위치 1.5km 안 반값택배 접수·픽업, 국내택배 접수를 등록한 GS25\n- [현금 출금 되는 편의점](https://cvs.guidejung.com/atm): 내 위치 1.5km 안 현금 출금·입금·스마트ATM을 등록한 GS25\n- [마감할인 하는 편의점](https://cvs.guidejung.com/closing-sale): 내 위치 1.5km 안 마감할인 서비스를 등록한 GS25(상품·가격은 보여 주지 않음)\n- 브랜드별 `/brand/cu|gs25|seven|emart24|ministop`: 전국 수·내 주변·많은 지역(상호 기준, 본사 공식 목록 아님)\n- [지역별](https://cvs.guidejung.com/region): 시군구 `/region/{시군구코드}`, 브랜드별 `/region/{코드}/{브랜드}`, 가장 가까운 약국까지 거리 중앙값·1km 안에 약국 없는 곳 수\n- 상세 `/store/{id}`: 이름·주소·전화·등록일·가장 가까운 약국(평일 마감·일요일)·밤 10시 넘어 여는 약국·가장 가까운 응급실\n\n## 데이터 안내\n- 재고·가격·실제 영업 시간·판매 품목은 공공데이터에 없어 표시하지 않습니다(붕어빵·군고구마 등 GS25 매장 서비스만 방문 때 따로 확인).\n- 약을 추천하거나 복용법을 안내하지 않습니다. 편의점 본사·가맹점과 관계없는 비공식 안내입니다.";
function numbers():string[]{
  const top=[...regions].sort((a,b)=>b.count-a.count).slice(0,15);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전국 안전상비의약품 판매 편의점 ${n(stores.length)}곳(시군구 ${n(regions.length)}곳, 영업 중으로 등록된 곳)`,
    `- 브랜드별(상호 기준·비공식): ${BRAND_ORDER.map(b=>`${BRANDS[b].label} ${n(nation.brands[b])}`).join(' · ')}`,
    `- 시도별: ${sidos.map(s=>`${s.name} ${n(s.count)}`).join(' · ')}`,
    '','## 상비약 편의점이 많은 시군구 15곳',...top.map(r=>`- [${r.name}](${SITE}/region/${r.id}): ${n(r.count)}곳${r.ph_mid!=null?`, 가장 가까운 약국까지 중앙값 ${meters(r.ph_mid)}`:''}`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
