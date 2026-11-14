import {label,regions,sidos,SITE} from '../../lib/regions';
import {fmtDate,snapFetched,snapNation,snapRegion,snapSum,snapTotal} from '../../lib/snapshot';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 정적 스냅샷으로 채움 — 11/14 사용자 승인(ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 충전소 (charge.guidejung.com)\n\n> 지금 바로 충전 가능한 곳. 전국 전기차 충전소 약 10만 곳·충전기 약 52만 대의 위치와 급속·완속, 무료 주차, 24시간 여부, 지금 사용 가능한 충전기 수를 한국환경공단 공식 자료로 보여 주는 서비스입니다.\n\n## 주요 페이지\n- [내 주변 충전소](https://charge.guidejung.com/): 가까운 순 충전소\n- [지역별 충전소](https://charge.guidejung.com/region): 시도 16곳·시군구 약 230곳, 주소 /region/{행정구역코드}(충전소·충전기·급속 수, 충전기별 실시간 상태)\n\n## 데이터와 인용\n- 출처: 한국환경공단 전기자동차 충전소 정보(충전소·충전기 목록은 매일, 충전기 상태는 5분 간격)\n- 충전소·충전기 수는 페이지에 표시된 기준일 자료이고, 사용 가능 여부는 실시간이라 인용할 때는 확인 시각을 함께 표기해 주세요.\n- [사이트맵](https://charge.guidejung.com/sitemap.xml), [RSS](https://charge.guidejung.com/rss.xml), [데이터·출처 안내](https://charge.guidejung.com/data-policy)\n\n## 함께 운영하는 사이트\n- [내근처 여행](https://trip.guidejung.com/llms.txt), [내근처 날씨](https://weather.guidejung.com/llms.txt), [내근처 고속도로](https://traffic.guidejung.com/llms.txt)";
function numbers():string[]{
  const nat=snapNation();
  const rows=regions.map(r=>({r,s:snapRegion(r.code)})).filter((x):x is {r:typeof x.r;s:NonNullable<typeof x.s>}=>!!x.s);
  const fast=[...rows].sort((a,b)=>b.s.fast-a.s.fast).slice(0,15);
  const free=[...rows].sort((a,b)=>b.s.freeParking-a.s.freeParking).slice(0,10);
  return [`## 숫자로 보기 (${fmtDate(snapFetched)} 기준, 하루 한 번 갱신 — 지금 사용 가능 여부는 실시간 화면에서)`,
    `- 전국 충전소 ${n(snapTotal.stations)}곳, 충전기 ${n(snapTotal.chargers)}대, 급속 충전기 ${n(nat.fast)}대`,
    `- 24시간 이용 충전소 ${n(nat.h24)}곳, 무료 주차 충전소 ${n(nat.freeParking)}곳`,
    `- 시도별 충전소: ${sidos.map(s=>`${s.short} ${n(snapSum(s.regions.map(r=>r.code)).stations)}`).join(' · ')}`,
    '','## 급속 충전기가 많은 시군구 15곳',...fast.map(({r,s})=>`- [${label(r)} 충전소](${SITE}/region/${r.code}): 급속 ${n(s.fast)}대, 충전소 ${n(s.stations)}곳`),
    '','## 무료 주차 충전소가 많은 시군구 10곳',...free.map(({r,s})=>`- [${label(r)}](${SITE}/region/${r.code}): 무료 주차 ${n(s.freeParking)}곳`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
