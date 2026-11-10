import {ITEMS} from '../../lib/items';
import {SITE} from '../../lib/fmt';
export const dynamic='force-static';
export function GET(){
  const urls=['/','/daiso','/about','/data-policy',...ITEMS.map(i=>`/daiso/${i.slug}`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
