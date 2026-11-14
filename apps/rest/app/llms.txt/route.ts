import {KIND_ORDER,KINDS,nation,places,regions,sidos,SITE,updated} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 휴식 (rest.guidejung.com)\n\n> 내 주변 찜질방·사우나·목욕탕·한증막, 1인·프라이빗 목욕탕과 세신샵, 안마원·안마시술소, 피부관리실을 가까운 순으로 보여 주는 서비스입니다. 출처는 행정안전부 지방행정 인허가데이터(목욕장업·의료유사업·미용업)이며 영업 중으로 신고된 곳만 매일 갱신합니다.\n\n## 주요 페이지\n- [찜질방·사우나·목욕탕](https://rest.guidejung.com/sauna), [1인 목욕탕·세신샵](https://rest.guidejung.com/private), [안마원·안마시술소](https://rest.guidejung.com/anma), [피부관리실](https://rest.guidejung.com/skin): 전국 수·내 주변·많은 지역\n- [이용 안내](https://rest.guidejung.com/guide): 업종별 차이(목욕장업·의료법 안마사·피부미용업), 신고된 업소 확인법\n- [지역별](https://rest.guidejung.com/region): 시군구 `/region/{시군구코드}`, 종류별 `/region/{코드}/sauna|private|anma|skin`\n- 상세 `/shop/{id}`: 이름·업태·주소·전화·신고일(영업 햇수)·근처 같은 종류\n\n## 데이터 안내\n- 가격·예약·영업 시간·사진·후기는 공공데이터에 없어 표시하지 않습니다(상세에서 네이버 지도 검색 링크·전화로 안내).\n- 1인·프라이빗 목욕·세신은 목욕장업 '목욕장업 기타' 업태와 이름(1인·프라이빗·세신 등)으로 묶은 것입니다.\n- 이름에 선정적인 표현이 든 업소와 출장 마사지는 다루지 않습니다.";
function numbers():string[]{
  const top=[...regions].sort((a,b)=>b.kinds.sauna-a.kinds.sauna).slice(0,15);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전체 ${n(places.length)}곳: ${KIND_ORDER.map(k=>`${KINDS[k].label} ${n(nation.kinds[k])}`).join(' · ')}`,
    `- 시도별: ${sidos.map(s=>`${s.name} ${n(s.count)}`).join(' · ')}`,
    '','## 찜질방·목욕탕이 많은 시군구 15곳',...top.map(r=>`- [${r.name}](${SITE}/region/${r.id}/sauna): ${KINDS.sauna.label} ${n(r.kinds.sauna)}곳`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
