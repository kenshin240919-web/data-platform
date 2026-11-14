import {cheapGas,fetched,fmtDate,gasStat,MAJOR,rests,roadName,routes,SITE,won} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 스냅샷으로 채움 — 11/14 사용자 승인(ChatGPT가 고속도로 유입의 큰 몫).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD='# 내근처 고속도로 (traffic.guidejung.com)\n\n> 지금 길 막혀? 전국 고속도로 실시간 교통정보 서비스입니다. 실시간 정체·서행 구간, 지금 가장 막히는 구간 TOP 10, 노선별 노선도와 CCTV, 휴게소 대표 음식·기름값·편의시설, 사고·공사 정보를 한국도로공사·국가교통정보센터 공식 자료로 보여 줍니다.\n\n## 주요 페이지\n- [지금 가장 막히는 구간](https://traffic.guidejung.com/): 전국 정체 TOP 10, 내 근처 고속도로(위치 허용 시)\n- [고속도로 노선](https://traffic.guidejung.com/road): 주소 `/road/{노선번호}` — IC 순 구간별 양방향 속도 색깔 노선도·CCTV·노선 휴게소\n- [휴게소](https://traffic.guidejung.com/rest): 주소 `/rest/{코드}` — 대표 음식·메뉴 가격·주유 가격(평균 대비)·편의시설·주변 충전소·날씨\n- [휴게소 기름값 순위](https://traffic.guidejung.com/gas): 휘발유·경유 싼 순서\n- [사고·공사](https://traffic.guidejung.com/incidents): 최근 3일 사고·공사·차로 통제\n\n## 데이터와 인용\n- 출처: 한국도로공사 공공데이터(실시간 소통 5분 간격, 휴게소·음식·주유 가격은 매일), 국가교통정보센터 ITS(CCTV·돌발)\n- 실시간 정체는 수시로 바뀌므로 아래 숫자는 노선·휴게소·가격 같은 하루 단위 자료만 담았습니다. 지금 막히는 곳은 첫 화면에서 확인하고, 인용할 때는 확인 시각과 "한국도로공사 자료"를 함께 표기해 주세요.\n- [사이트맵](https://traffic.guidejung.com/sitemap.xml), [RSS](https://traffic.guidejung.com/rss.xml), [데이터·출처 안내](https://traffic.guidejung.com/data-policy)';
export function GET(){
  const zones=routes.reduce((a,r)=>a+r.E.length+r.S.length,0);
  const g=gasStat('gasoline'),d=gasStat('diesel');
  const major=MAJOR.map(no=>routes.find(r=>r.no===no)).filter(Boolean) as typeof routes;
  const foods=rests.filter(r=>r.foods.some(f=>f.best)).length;
  const best=rests.flatMap(r=>r.foods.filter(f=>f.best&&won(f.cost)).map(f=>({r,f})));
  const top=(k:'gasoline'|'diesel',list:typeof rests)=>list.slice(0,10).map(r=>`- [${r.name}](${SITE}/rest/${r.code}): ${roadName({name:r.route})}, ${k==='gasoline'?'휘발유':'경유'} ${n(won(r.gas![k])!)}원`);
  const lines=[HEAD,'',`## 숫자로 보기 (${fmtDate(fetched)} 기준)`,
    `- 고속도로 노선 ${n(routes.length)}개, 실시간 소통 구간 ${n(zones)}개(양방향 합계)`,
    `- 휴게소 ${n(rests.length)}곳, 이 중 주유소 가격이 있는 곳 ${n(g.list.length)}곳, 대표 음식이 등록된 곳 ${n(foods)}곳`,
    `- 휴게소 평균 휘발유 ${n(g.avg)}원·경유 ${n(d.avg)}원, 가장 싼 휘발유 ${g.list[0]?`${g.list[0].name} ${n(won(g.list[0].gas!.gasoline)!)}원`:'없음'}, 가장 싼 경유 ${d.list[0]?`${d.list[0].name} ${n(won(d.list[0].gas!.diesel)!)}원`:'없음'}`,
    best.length?`- 대표 음식 ${n(best.length)}가지, 가격 중앙값 ${n([...best].map(x=>won(x.f.cost)!).sort((a,b)=>a-b)[Math.floor(best.length/2)])}원`:'',
    '','## 주요 고속도로',...major.map(r=>`- [${roadName(r)}](${SITE}/road/${r.no}): ${r.start}~${r.end}, 구간 ${n(r.E.length+r.S.length)}개, 휴게소 ${n(rests.filter(x=>x.routeNo===r.no).length)}곳`),
    '','## 휘발유가 싼 휴게소 10곳',...top('gasoline',cheapGas()),
    '','## 경유가 싼 휴게소 10곳',...top('diesel',d.list),
    '','## 함께 운영하는 사이트',
    '- [내근처 여행](https://trip.guidejung.com/llms.txt), [내근처 날씨](https://weather.guidejung.com/llms.txt), [내근처 충전소](https://charge.guidejung.com/llms.txt), [내근처 주유소](https://oil.guidejung.com/llms.txt), [내근처 주차장](https://parking.guidejung.com/llms.txt)',''];
  return new Response(lines.join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
