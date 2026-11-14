import {KIND_ORDER,KINDS,nation,places,regions,sidos,SITE,updated} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(시장·고속도로와 같은 방식, ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 동물병원 (pet.guidejung.com)\n\n> 내 주변 동물병원·24시 동물병원(이름 기준), 지금 문 연 동물약국, 펫호텔·애견 유치원, 애견·고양이 카페, 펫택시를 가까운 순으로 보여 주는 서비스입니다. 출처는 행정안전부 지방행정 인허가데이터(동물병원·동물약국·동물위탁관리업·동물전시업·동물운송업)이며 영업 중으로 신고된 곳만 매일 갱신합니다. 동물약국 영업 시간은 국립중앙의료원 약국 정보입니다.\n\n## 주요 페이지\n- [24시 동물병원](https://pet.guidejung.com/24h): 이름에 '24'가 든 동물병원 전국 목록(시도별)\n- [동물병원](https://pet.guidejung.com/hospital), [동물약국](https://pet.guidejung.com/pharmacy), [펫호텔·유치원](https://pet.guidejung.com/hotel), [애견·고양이 카페](https://pet.guidejung.com/cafe), [펫택시](https://pet.guidejung.com/taxi): 전국 수·내 주변·많은 지역\n- [우리 아이 아플 때](https://pet.guidejung.com/guide): 동물병원 가기 전 순서, 업종별 차이\n- [지역별](https://pet.guidejung.com/region): 시군구 `/region/{시군구코드}`, 종류별 `/region/{코드}/hospital|pharmacy|hotel|cafe|taxi`\n- 상세 `/place/{id}`: 이름·종류·주소·전화·개설일, 동물약국은 요일별 영업 시간·지금 상태, 근처 24시 동물병원\n\n## 데이터 안내\n- 동물병원 진료 시간·진료 과목·가격·후기는 공공데이터에 없어 표시하지 않습니다(상세에서 네이버 지도 검색 링크·전화로 안내).\n- '24시 동물병원'은 병원 이름에 '24'가 들어간 곳입니다. 실제 야간 진료 여부는 병원에 확인해야 합니다.";
function numbers():string[]{
  const top=[...regions].sort((a,b)=>b.kinds.hospital-a.kinds.hospital).slice(0,15);
  const h24=[...regions].filter(r=>r.h24).sort((a,b)=>b.h24-a.h24).slice(0,10);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전체 ${n(places.length)}곳: ${KIND_ORDER.map(k=>`${KINDS[k].label} ${n(nation.kinds[k])}`).join(' · ')}`,
    `- 이름에 24시가 든 동물병원 ${n(nation.h24)}곳, 영업 시간이 있는 곳 ${n(nation.withHours)}곳`,
    `- 시도별 동물병원: ${sidos.map(s=>`${s.name} ${n(s.hospital)}`).join(' · ')}`,
    '','## 동물병원이 많은 시군구 15곳',...top.map(r=>`- [${r.name} 동물병원](${SITE}/region/${r.id}): ${n(r.kinds.hospital)}곳, 동물약국 ${n(r.kinds.pharmacy)}곳`),
    '','## 24시 동물병원이 많은 시군구 10곳',...h24.map(r=>`- [${r.name}](${SITE}/region/${r.id}): 24시 ${n(r.h24)}곳`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
