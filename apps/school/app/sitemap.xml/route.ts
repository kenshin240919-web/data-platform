import {regions,schoolPath,schools,SITE} from '../../lib/data';
// 정적 페이지 + 학교 상세(학교 목록이 빌드 파일에 있어 한 파일로, 5만 개 미만).
export const dynamic='force-static';
export function GET(){
  const urls=['/','/region','/about','/data-policy',...regions.map(r=>`/region/${r.id}`),...schools.map(s=>schoolPath(s.code))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
