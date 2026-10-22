import {COND_MIN,CONDITIONS,n,regions,SITE,status,type Cond} from '../../lib/data';
// RSS 2.0 (search engine discovery): region and region×condition pages. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=regions.flatMap(r=>[item(`${r.name} 주차장 ${n(r.count)}곳`,`/region/${r.id}`,`${r.name} 공영 주차장 · 무료 ${n(r.cond.free)}곳${r.hour!=null?` · 1시간 보통 ${n(r.hour)}원`:''}`),
    ...(Object.keys(CONDITIONS) as Cond[]).filter(c=>r.cond[c]>=COND_MIN).map(c=>item(`${r.name} ${CONDITIONS[c].title} ${n(r.cond[c])}곳`,`/region/${r.id}/${c}`,`${r.name}에서 ${CONDITIONS[c].desc} 주차장`))]).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 주차장</title><link>${SITE}/</link><description>내 주변 공영·무료 주차장과 예상 요금</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
