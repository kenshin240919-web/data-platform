import {CHAIN_ORDER,CHAINS,nation,regions,sidos,SITE,specials,theaters,updated} from '../../lib/data';
// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 데이터로 채움 — 11/14 사용자 승인(ChatGPT 유입 늘리기).
export const dynamic='force-static';
const n=(v:number)=>v.toLocaleString('ko-KR');
const HEAD="# 내근처 영화관 (movie.guidejung.com)\n\n> 내 주변 영화관을 가까운 순으로 찾아 오늘 곧 시작하는 영화와 남은 좌석을 보여 주는 서비스입니다. 극장 목록은 행정안전부 지방행정 인허가데이터(영화상영관)를 매일 받아 상영관을 극장 단위로 묶은 것이고, 박스오피스는 영화진흥위원회 통합전산망 오픈 API를 방문 때마다 바로 조회해 보여 줍니다(저장하지 않음).\n\n## 주요 페이지\n- [어제 박스오피스](https://movie.guidejung.com/boxoffice): 일별 관객 수 순위·누적 관객 수(영화진흥위원회 통합전산망 오픈 API, 방문 때 조회)\n- [자동차극장](https://movie.guidejung.com/drive): 전국 자동차극장(드라이브인)\n- 체인별 `/chain/cgv|lotte|mega|cineq|indie`: 전국 수·내 주변·많은 지역(등록 상호 기준, 본사 공식 목록 아님)\n- [지역별](https://movie.guidejung.com/region): 시군구 `/region/{시군구코드}` 극장 수·상영관 수·특별관\n- 극장 `/theater/{id}`: 주소·전화·상영관 수·특별관(이름 기준)·가까운 공영주차장·근처 극장, 오늘 남은 상영(CGV·롯데시네마·메가박스, 극장 앱 정보를 공개 중계로 받은 비공식 안내)\n\n## 데이터 안내\n- 상영 시간·남은 좌석은 비공식 안내이며 예매는 하지 않습니다. 영화 줄거리·평점·관람료는 보여 주지 않습니다.\n- 극장 본사와 관계없는 비공식 안내입니다.";
function numbers():string[]{
  const top=[...regions].sort((a,b)=>b.count-a.count).slice(0,15);
  const sp=specials().slice(0,8);
  return [`## 숫자로 보기 (${updated()} 기준)`,
    `- 전국 영화관 ${n(theaters.length)}곳(시군구 ${n(regions.length)}곳), 상영관 ${n(theaters.reduce((a,t)=>a+(t.screens??0),0))}개`,
    `- 체인별: ${CHAIN_ORDER.map(c=>`${CHAINS[c].label} ${n(nation.chains[c])}`).join(' · ')}`,
    ...(sp.length?[`- 특별관(상영관 이름 기준): ${sp.map(([k,v])=>`${k} ${n(v)}`).join(' · ')}`]:[]),
    `- 시도별: ${sidos.map(s=>`${s.name} ${n(s.count)}`).join(' · ')}`,
    '','## 영화관이 많은 시군구 15곳',...top.map(r=>`- [${r.name} 영화관](${SITE}/region/${r.id}): ${n(r.count)}곳, 상영관 ${n(r.screens)}개`)];
}
export function GET(){
  return new Response([HEAD,'',...numbers(),''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
