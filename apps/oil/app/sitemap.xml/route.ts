import {regions,SITE,sidos,diesel,stations,stationPath} from '../../lib/data';
// 정적 페이지 + 지역 + 시도 경유 + 주유소 상세(최근 60일, 5만 개 미만이라 한 파일).
export const dynamic='force-static';
export function GET(){
  const urls=['/','/region','/diesel','/about','/data-policy',...regions.map(r=>`/region/${r.code}`),...sidos.filter(s=>diesel(s.code).length).map(s=>`/diesel/${s.code}`),...stations.map(s=>stationPath(s.id))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
