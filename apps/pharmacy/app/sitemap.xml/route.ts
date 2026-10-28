import {CONDITIONS,pharmacies,pharmacyPath,regions,SITE,type Cond} from '../../lib/data';
// 정적 페이지 + 지역×조건 + 약국 상세(약 2만 5천 곳, 5만 개 미만이라 한 파일).
// 상세는 단계별로(collect-pharmacy.py stage_of: 1 밤·일요일·공휴일 → 2 평일 20시·토 17시 이후 → 3 나머지) — 구글이 새 사이트를
// 천천히 수집하므로 좋은 페이지부터. 색인이 늘면 숫자만 올림.
const SITEMAP_STAGE=1;
export const dynamic='force-static';
export function GET(){
  const urls=['/','/region','/about','/data-policy',...regions.map(r=>`/region/${r.id}`),...regions.flatMap(r=>(Object.keys(CONDITIONS) as Cond[]).filter(c=>r.cond[c]).map(c=>`/region/${r.id}/${c}`)),...pharmacies.filter(p=>((p as {stage?:number}).stage??1)<=SITEMAP_STAGE).map(p=>pharmacyPath(p.id))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
