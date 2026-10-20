import {COND_KEY,MIN_DEPT,regions,SITE} from '../../lib/data';
// Static pages (the Worker's /sitemap.xml lists this file plus the hospital detail sitemaps from D1).
export const dynamic='force-static';
export function GET(){
  const urls=['/','/region','/er','/about','/data-policy',...regions.map(r=>`/region/${r.id}`),
    ...regions.flatMap(r=>[...Object.entries(r.depts).filter(([,d])=>d.count>=MIN_DEPT).map(([k])=>`/region/${r.id}/${k}`),...Object.entries(COND_KEY).filter(([,k])=>r.cond[k]).map(([s])=>`/region/${r.id}/${s}`)])];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
