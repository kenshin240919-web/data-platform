import {MIN_SUBJECT,regions,SITE} from '../../lib/data';
import {RANK_SUBJECTS} from '../../lib/rank';
// Static pages (the Worker's /sitemap.xml lists this file plus the academy detail sitemaps from D1).
export const dynamic='force-static';
export function GET(){
  const urls=['/','/region','/rank','/new',...RANK_SUBJECTS.map(k=>`/rank/${k}`),'/about','/data-policy',...regions.map(r=>`/region/${r.id}`),...regions.flatMap(r=>Object.entries(r.subjects).filter(([,s])=>s.count>=MIN_SUBJECT).map(([k])=>`/region/${r.id}/${k}`))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
