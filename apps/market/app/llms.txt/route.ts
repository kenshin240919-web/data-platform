import {CAT_ORDER,CATS,fairs,markets,marketPath,n,nation,pct,regions,SITE,sidos,updated} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/12 GA: 시장 사이트 유입의 대부분이 ChatGPT(157/188 세션).
export const dynamic='force-static';
const HEAD='# 내근처 시장 (market.guidejung.com)\n\n> 온누리상품권 사용처(가맹점)를 내 주변부터, 전통시장·상점가별, 시도·시군구별, 품목별(음식점·카페·정육·수산·과일·반찬·마트·옷·미용·약국·생활·학원·여가·꽃)로 찾아 주는 서비스입니다. 출처는 소상공인시장진흥공단 「전국 온누리상품권 가맹점 현황」(공공데이터포털, 연 1회)과 전국전통시장표준데이터이며, 매일 새 파일이 있는지 확인합니다.\n\n## 주요 페이지\n- [오늘 장 서는 5일장](https://market.guidejung.com/jang): 날짜별(오늘·내일·7일) 장 서는 시장을 내 주변부터, 장날별(1·6일장~5·10일장) 전국 목록. 온누리 가맹 시장이 아닌 5일장은 `/jang/{id}`(장날·주소·점포 수·취급 품목·주차장·가까운 5일장)\n- [품목별](https://market.guidejung.com/item): `/item/{food|cafe|meat|fish|fruit|side|mart|cloth|beauty|health|home|edu|leisure|flower|etc}` 전국 가맹점 수·많은 시군구·시장\n- [지역별](https://market.guidejung.com/region): 시도 `/sido/{slug}`, 시군구 `/region/{시군구코드}`, 시군구×품목 `/region/{코드}/{품목}`\n- 시장·상점가 `/market/{id}`: 가맹점 목록(품목·지류/디지털 가맹 여부·가맹 연도), 시장 주소·장 서는 날(5일장이면 다음 장날)·주차장, 가까운 시장\n- [온누리 안내](https://market.guidejung.com/guide): 지류형·디지털형 가맹점 차이, 가맹점 확인 방법\n\n## 데이터 안내\n- 공식 목록에는 가게 주소가 없어 위치는 소속 시장·상점가 단위입니다.\n- 모든 가맹점은 지류형 가맹점이고, 디지털형(모바일·카드) 가맹 여부는 가게마다 표시합니다.\n- 구매 한도·할인율 같은 상품권 규칙은 다루지 않습니다(발행처 공식 안내 확인). 이 사이트는 소상공인시장진흥공단과 관계없는 민간 정보 서비스입니다.';
export function GET(){
  const top=[...markets].sort((a,b)=>b.n-a.n).slice(0,30);
  const topRegions=[...regions].sort((a,b)=>b.n-a.n).slice(0,15);
  const lines=[HEAD,'',`## 숫자로 보기 (${updated()} 기준)`,
    `- 전국 온누리상품권 가맹점 ${n(nation.n)}곳(모두 지류형), 이 중 디지털형(모바일·카드)도 되는 곳 ${n(nation.d)}곳(${pct(nation.d,nation.n)}%)`,
    `- 전통시장·상점가 ${n(nation.markets)}곳, 장 서는 날이 정해진 5일장 ${n(fairs.length)}곳`,
    `- 품목별 가맹점: ${CAT_ORDER.filter(c=>nation.cats[c]).map(c=>`${CATS[c].label} ${n(nation.cats[c])}`).join(' · ')}`,
    `- 시도별 가맹점: ${sidos.map(s=>`${s.full} ${n(s.n)}`).join(' · ')}`,
    '',`## 가맹점이 많은 시장·상점가 30곳`,...top.map(m=>`- [${m.name}](${SITE}${marketPath(m.id)}): ${m.region_name??m.sido}, 가맹점 ${n(m.n)}곳(디지털 ${n(m.d)})`),
    '',`## 가맹점이 많은 시군구 15곳`,...topRegions.map(r=>`- [${r.name}](${SITE}/region/${r.id}): 가맹점 ${n(r.n)}곳, 시장·상점가 ${n(r.markets.length)}곳`),''];
  return new Response(lines.join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
