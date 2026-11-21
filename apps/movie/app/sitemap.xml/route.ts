import {CHAIN_ORDER,regions,SITE,theaters} from '../../lib/data';
import {filmList,filmPath,hasKobis} from '../../lib/kobis';
// 정적 사이트맵(극장 + 지역·체인·안내 + 11/22 KOBIS 승낙 뒤 박스오피스·영화 페이지).
export const dynamic='force-static';
export function GET(){
  const urls=['/','/boxoffice',...(hasKobis?['/boxoffice/weekly','/boxoffice/weekend','/film',...filmList.map(f=>filmPath(f.cd))]:[]),'/drive','/region','/about','/data-policy',...CHAIN_ORDER.map(c=>`/chain/${c}`),...regions.map(r=>`/region/${r.id}`),...theaters.map(t=>`/theater/${t.id}`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
