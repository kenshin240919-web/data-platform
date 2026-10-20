import {CONDITIONS,n,regions,SITE,status,type Cond} from '../../lib/data';
// RSS 2.0 (search engine discovery): region and region×condition pages. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=regions.flatMap(r=>[item(`${r.name} 약국 ${n(r.count)}곳`,`/region/${r.id}`,`${r.name} 지금 문 연 약국·심야 ${n(r.cond.night)}곳·일요일 ${n(r.cond.sunday)}곳`),
    ...(Object.keys(CONDITIONS) as Cond[]).filter(c=>r.cond[c]).map(c=>item(`${r.name} ${CONDITIONS[c].title} ${n(r.cond[c])}곳`,`/region/${r.id}/${c}`,`${r.name}에서 ${CONDITIONS[c].desc} 약국`))]).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 약국</title><link>${SITE}/</link><description>지금 문 연 약국·심야·일요일·공휴일 약국</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
