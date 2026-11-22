import {fairOf,jangDaysText,markets,marketPath,n,pct,regions,SITE,sidos,updated} from '../../lib/data';
// llms-full.txt (11/22): 시장·상점가 전부와 시군구 전부 — ChatGPT 등이 'OO시장 온누리 되나요'를 이름으로 바로 맞추게. llms.txt는 요약만.
export const dynamic='force-static';
export function GET(){
  const lines=[`# 내근처 시장 — 온누리상품권 사용처 전체 목록 (${updated()} 기준)`,'',
    '> 소상공인시장진흥공단 온누리상품권 가맹점 공개 목록을 전통시장·상점가별로 묶은 것입니다. 숫자는 가맹점 수(디지털형도 되는 곳 비율). 가게 하나하나는 각 시장 페이지에서 볼 수 있습니다.','',
    ...sidos.flatMap(s=>['',`## ${s.full} (가맹점 ${n(s.n)}곳)`,
      ...markets.filter(m=>m.sido===s.name).sort((a,b)=>b.n-a.n).map(m=>{const f=fairOf(m);
        return `- [${m.name}](${SITE}${marketPath(m.id)}): ${m.region_name??s.full}, 가맹점 ${n(m.n)}곳(디지털 ${pct(m.d,m.n)}%)${f?`, 장날 ${jangDaysText(f)}`:''}`;})]),
    '','## 시군구별 사용처',...regions.map(r=>`- [${r.name} 온누리상품권 사용처](${SITE}/region/${r.id}): 가맹점 ${n(r.n)}곳, 시장·상점가 ${n(r.markets.length)}곳`),''];
  return new Response(lines.join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
