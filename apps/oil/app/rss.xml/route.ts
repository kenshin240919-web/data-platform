import {regions,SITE,status,won} from '../../lib/data';
// RSS 2.0 (search engine discovery): 시군구 최저가 페이지. Rebuilt on each daily price update.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const items=regions.map(r=>`<item><title>${esc(`${r.label} 휘발유 최저가 ${won(r.items[0]?.prices.B027)}`)}</title><link>${SITE}/region/${r.code}</link><guid isPermaLink="true">${SITE}/region/${r.code}</guid><pubDate>${now}</pubDate><description>${esc(`${r.label} 평균 휘발유 ${won(r.avg.B027?.price)} · 가장 싼 곳 ${r.items[0]?.name??''}`)}</description></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 주유소</title><link>${SITE}/</link><description>오늘 휘발유·경유 최저가 주유소</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
