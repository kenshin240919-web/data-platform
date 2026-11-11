import {BRAND_ORDER,COND_MIN,regions,SITE} from '../../lib/data';
// 정적 페이지 + 지역×브랜드. 매장 상세 사이트맵은 Worker(/sitemap-stores-{n}.xml), 묶음은 /sitemap.xml(Worker).
export const dynamic='force-static';
export function GET(){
  const brands=BRAND_ORDER.filter(k=>k!=='other');
  const urls=['/','/medicine','/bungeoppang','/half-delivery','/atm','/closing-sale','/region','/about','/data-policy',...brands.map(b=>`/brand/${b}`),...regions.map(r=>`/region/${r.id}`),...regions.flatMap(r=>brands.filter(k=>r.brands[k]>=COND_MIN).map(k=>`/region/${r.id}/${k}`))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
