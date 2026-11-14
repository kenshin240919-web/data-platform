import {cheapest,nation,PROD_LABEL,regions,sidos,SITE,stationPath,status,todayStations,updated,type Prod} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(시장·고속도로와 같은 방식, ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 주유소 (oil.guidejung.com)\n\n> 내 주변 휘발유·경유 가장 싼 주유소를 가격·거리로 보여 주고, 시군구·시도별 평균 기름값과 최저가 주유소를 정리한 서비스입니다. 출처는 한국석유공사 오피넷이며 하루 한 번(아침) 갱신합니다.\n\n## 주요 페이지\n- [지역별 휘발유](https://oil.guidejung.com/region): 시도·시군구 평균 휘발유 가격\n- 시군구 페이지 `/region/{오피넷 시군구코드}` 예: https://oil.guidejung.com/region/0113 (서울 강남구): 휘발유 싼 순 20곳\n- [경유 최저가](https://oil.guidejung.com/diesel), 시도별 `/diesel/{시도코드}` 예: https://oil.guidejung.com/diesel/01 (서울)\n- 주유소 상세 `/station/{오피넷 주유소ID}`: 휘발유·경유 가격, 지역 평균 대비, 순위, 길찾기, 근처 싼 주유소\n\n## 데이터 안내\n- 가격은 주유소가 오피넷에 보고한 값을 하루 한 번 받은 것입니다. 주유 전 현장 가격 확인을 권합니다.\n- 최저가 목록에 든 주유소만 보여 주므로 모든 주유소가 나오지는 않습니다. 셀프 여부는 주유소 이름으로 판단합니다.";
function numbers():string[]{
  const won=(v?:number|null)=>v==null?'-':`${n(Math.round(v))}원`;
  const cheap=(p:Prod)=>cheapest(p,10).map(s=>`- [${s.name}](${SITE}${stationPath(s.id)}): ${s.address??''} ${PROD_LABEL[p]} ${won(s.prices[p])}`);
  const avgOf=(r:(typeof regions)[number])=>r.avg?.B027?.price??null;
  const low=[...regions].filter(r=>avgOf(r)!=null).sort((a,b)=>avgOf(a)!-avgOf(b)!).slice(0,10);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전국 평균 휘발유 ${won(nation.B027?.price)}·경유 ${won(nation.D047?.price)}(오피넷 전국 평균)`,
    `- 오늘 가격을 받은 주유소 ${n(todayStations.length)}곳(시군구 ${n(status.regions)}곳, 지역마다 휘발유 가장 싼 20곳)`,
    `- 시도별 평균 휘발유: ${sidos.map(s=>`${s.name} ${won(s.B027?.price)}`).join(' · ')}`,
    '','## 휘발유가 가장 싼 주유소 10곳',...cheap('B027'),
    '','## 경유가 가장 싼 주유소 10곳',...cheap('D047'),
    '','## 평균 휘발유가 싼 시군구 10곳',...low.map(r=>`- [${r.label}](${SITE}/region/${r.code}): 평균 ${won(avgOf(r))}`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
