import {COND_MIN,docs,KIND_ORDER,regions,SITE} from '../../lib/data';
// 정적 페이지 + 서류별 + 지역×종류. 상세 페이지 사이트맵은 Worker(/sitemap-places-1.xml), 묶음은 /sitemap.xml(Worker).
export const dynamic='force-static';
export function GET(){
  const urls=['/',...KIND_ORDER.map(k=>`/${k}`),'/doc',...docs.filter(d=>d.count).map(d=>`/doc/${d.slug}`),'/weekend','/print','/guide','/region','/about','/data-policy',...regions.map(r=>`/region/${r.id}`),...regions.flatMap(r=>KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>`/region/${r.id}/${k}`))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
