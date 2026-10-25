import {SITUATIONS} from '../../lib/situations';
import {SEASONS} from '../../lib/seasons';
import {SITE} from '../../lib/site';
export const dynamic='force-static';
export function GET(){
  const urls=['/',...SITUATIONS.map(s=>`/situation/${s.slug}`),...SEASONS.map(s=>`/season/${s.slug}`),'/about','/data-policy'];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
