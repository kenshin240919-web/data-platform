import {benefitPath,FIELD_ORDER,items,regionFields,regions,SITE,SITEMAP_STAGE,stageOf} from '../../lib/data';
// 정적 페이지 + 혜택 상세(단계별: 학원·병원과 같은 방식 — SITEMAP_STAGE를 올리면 다음 단계까지). 상세는 모두 만들어 두고 링크로는 이어짐.
export const dynamic='force-static';
export function GET(){
  const urls=['/','/find','/deadline','/new','/topic','/region','/about','/data-policy',...FIELD_ORDER.map(f=>`/topic/${f}`),...regions.map(r=>`/region/${r.code}`),
    ...regions.flatMap(r=>regionFields(r).map(f=>`/region/${r.code}/${f}`)),...items.filter(i=>stageOf(i)<=SITEMAP_STAGE).map(i=>benefitPath(i.id))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
