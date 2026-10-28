import {CAT_ORDER,fairs,ownFairs,markets,regionCats,regions,SITE,sidos} from '../../lib/data';
// 정적 페이지 전부(시도·시군구·시군구×품목·품목·시장). 가게 상세(/store/{id})는 noindex라 넣지 않음. 묶음은 /sitemap.xml(Worker).
export const dynamic='force-static';
export function GET(){
  const urls=['/',...(fairs.length?['/jang']:[]),...ownFairs.map(f=>`/jang/${f.id}`),'/item','/region','/guide','/about','/data-policy',...CAT_ORDER.map(c=>`/item/${c}`),...sidos.map(s=>`/sido/${s.slug}`),...regions.map(r=>`/region/${r.id}`),
    ...regions.flatMap(r=>regionCats(r).map(c=>`/region/${r.id}/${c}`)),...markets.map(m=>`/market/${m.id}`)];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
