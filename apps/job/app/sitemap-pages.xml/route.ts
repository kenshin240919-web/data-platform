import {COND_MIN,KIND_ORDER,regions,SITE} from '../../lib/data';
import {cats} from '../../lib/scheduleData';
import {MIN_WAGES} from '../../lib/calc';
import {CASE_ORDER,PAYS} from '../../lib/yearendPages';
// 정적 페이지 + 지역×종류. 상세 페이지 사이트맵은 Worker(/sitemap-places-{n}.xml), 묶음은 /sitemap.xml(Worker).
export const dynamic='force-static';
export function GET(){
  const urls=['/',...KIND_ORDER.map(k=>`/${k}`),'/guide','/calc','/calc/wage','/calc/unemployment','/calc/severance','/calc/insurance','/calc/yearend',...CASE_ORDER.map(k=>`/calc/yearend/${k}`),...PAYS.map(v=>`/calc/yearend/${v}`),...Object.keys(MIN_WAGES).map(y=>`/calc/minimum-wage/${y}`),'/schedule',...cats.map(c=>`/schedule/${c}`),'/region','/about','/data-policy',...regions.map(r=>`/region/${r.id}`),...regions.flatMap(r=>KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>`/region/${r.id}/${k}`))];
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${SITE}${u}</loc></url>`).join('')}</urlset>\n`,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
