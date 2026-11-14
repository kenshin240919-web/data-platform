// llms.txt (AI 검색·답변 엔진용 요약): 설명은 고정 글, 숫자·목록은 빌드 때 summary.json으로(11/14 — 일자리·시장 방식).
import {cond,DEPTS,erCount,n,nation,regions,sidos,SITE,status,updated} from '../../lib/data';
export const dynamic='force-static';
const HEAD=`# 내근처 병원 (hospital.guidejung.com)

> 내 주변 지금 진료 중인 병·의원을 진료과목별로 가까운 순으로 보여 주고, 야간·일요일·공휴일 진료 병원을 지역(시군구)별로 정리하며, 가까운 응급실과 실시간 응급실 남은 병상을 보여 주는 서비스입니다. 출처는 국립중앙의료원 전국 병·의원 찾기·응급의료기관 정보 조회 서비스(공공데이터포털)이며 매일 갱신합니다.

## 주요 페이지
- [지금 진료 중인 병원(내 주변)](${SITE}/)
- [밤·주말 소아과](${SITE}/kids): 야간·일요일·공휴일 소아청소년과
- [설 연휴 문 여는 병원](${SITE}/seol)
- [응급실 실시간 남은 병상](${SITE}/er)
- [지역별 병원](${SITE}/region)
- 시군구 \`/region/{시군구코드}\`, 시군구×진료과목 \`/region/{코드}/{과목}\`(pediatrics 소아청소년과·internal 내과·ent 이비인후과·ortho 정형외과·derma 피부과·eye 안과·obgyn 산부인과·dental 치과·korean 한의원 등), 시군구×조건 \`/region/{코드}/night|sunday|holiday\`
- 병원 상세 \`/hospital/{기관ID}\`: 요일별·공휴일 진료 시간, 지금 진료 여부, 진료과목, 응급실 남은 병상(응급실 운영 기관)

## 데이터 안내
- 진료 시간·진료과목은 병원이 신고한 정보이며 점심시간·임시 휴진은 반영되지 않습니다. 진료과목은 전문의 여부와 다릅니다.
- 의료 상담·진단을 하지 않습니다. 위급한 상황에는 119에 전화해야 합니다.`;
export function GET(){
  const big=[...regions].sort((a,b)=>b.count-a.count).slice(0,15);
  const lines=[HEAD,'',`## 숫자로 보기 (${updated()} 기준)`,
    `- 전국 병·의원 ${n(status.count)}곳, 응급실 운영 ${n(erCount)}곳`,
    `- 평일 저녁 8시 넘어서까지 진료(야간) ${n(cond.night)}곳, 토요일 ${n(cond.sat)}곳, 일요일 ${n(cond.sun)}곳, 공휴일 ${n(cond.hol)}곳`,
    `- 진료과목별: ${Object.entries(nation).filter(([,v])=>v).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>`${DEPTS[k]??k} ${n(v)}곳`).join(', ')}`,
    '',`## 시도별 (병원 · 야간 · 일요일 · 공휴일)`,
    ...sidos.map(s=>{const c=s.regions.reduce((a,r)=>({night:a.night+r.cond.night,sun:a.sun+r.cond.sun,hol:a.hol+r.cond.hol}),{night:0,sun:0,hol:0});return `- [${s.name}](${SITE}/region#${encodeURIComponent(s.name)}): ${n(s.count)}곳 · 야간 ${n(c.night)} · 일요일 ${n(c.sun)} · 공휴일 ${n(c.hol)}`;}),
    '',`## 병원 많은 시군구`,
    ...big.map(r=>`- [${r.name}](${SITE}/region/${r.id}): ${n(r.count)}곳, 야간 ${n(r.cond.night)}곳·일요일 ${n(r.cond.sun)}곳${r.depts.pediatrics?` · [소아과 ${n(r.depts.pediatrics.count)}곳](${SITE}/region/${r.id}/pediatrics)`:''}`),''];
  return new Response(lines.join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
