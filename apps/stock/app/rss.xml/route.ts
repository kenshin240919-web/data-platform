import {ITEMS} from '../../lib/items';
import {SITE} from '../../lib/fmt';
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date().toUTCString();
  const items=ITEMS.map(i=>`<item><title>${esc(`다이소 ${i.name} 재고 · 내 동네 매장`)}</title><link>${SITE}/daiso/${i.slug}</link><guid isPermaLink="true">${SITE}/daiso/${i.slug}</guid><pubDate>${now}</pubDate><description>${esc(i.lead)}</description></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 재고</title><link>${SITE}/</link><description>내 동네 매장에 그 물건 있는지</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
