import {COND_MIN,CONDITIONS,lots,lotPath,regions,SITE,type Cond} from '../../lib/data';
// 정적 페이지 + 지역×조건 + 주차장 상세(약 1만 8천 곳, 5만 개 미만이라 한 파일).
export const dynamic='force-static';
export function GET(){
  const urls=['/','/region','/about','/data-policy',...regions.map(r=>`/region/${r.id}`),...regions.flatMap(r=>(Object.keys(CONDITIONS) as Cond[]).filter(c=>r.cond[c]>=COND_MIN).map(c=>`/region/${r.id}/${c}`)),...lots.map(p=>lotPath(p.id))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
