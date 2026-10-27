import {CAT_ORDER,CATS,markets,n,nation,regions,SITE,sidos,status} from '../../lib/data';
// RSS 2.0 (search engine discovery): 품목·시도·시군구 페이지와 가맹점이 많은 시장 500곳. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=[...CAT_ORDER.map(c=>item(`온누리상품권 ${CATS[c].label} 사용처 ${n(nation.cats[c])}곳`,`/item/${c}`,CATS[c].q)),
    ...sidos.map(s=>item(`${s.full} 온누리상품권 사용처 ${n(s.n)}곳`,`/sido/${s.slug}`,`전통시장·상점가 ${n(s.markets.length)}곳`)),
    ...regions.map(r=>item(`${r.name} 온누리상품권 사용처 ${n(r.n)}곳`,`/region/${r.id}`,r.markets.slice(0,3).map(m=>m.name).join('·'))),
    ...[...markets].sort((a,b)=>b.n-a.n).slice(0,500).map(m=>item(`${m.name} 온누리상품권 가맹점 ${n(m.n)}곳`,`/market/${m.id}`,m.region_name??m.sido))].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 시장 — 온누리상품권 사용처</title><link>${SITE}/</link><description>내 주변 온누리상품권 가맹점·전통시장·상점가</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
