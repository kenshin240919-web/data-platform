import {CHAIN_ORDER,CHAINS,n,regions,SITE,status} from '../../lib/data';
// RSS 2.0 (search engine discovery): chain and region pages. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=[item('어제 박스오피스','/boxoffice','일별 관객 수 순위'),item('자동차극장','/drive','전국 자동차극장'),...CHAIN_ORDER.map(c=>item(`내 주변 ${CHAINS[c].title}`,`/chain/${c}`,`전국 ${CHAINS[c].title}`)),
    ...regions.map(r=>item(`${r.name} 영화관 ${n(r.count)}곳`,`/region/${r.id}`,`${r.name} 극장과 오늘 남은 상영`))].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 영화관</title><link>${SITE}/</link><description>내 주변 극장과 오늘 남은 상영</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
