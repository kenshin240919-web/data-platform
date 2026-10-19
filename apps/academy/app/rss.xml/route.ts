import {n,regions,SITE,status,SUBJECTS} from '../../lib/data';
// RSS 2.0 of the region pages (search engine discovery). Rebuilt on each deploy (daily data commit).
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const items=regions.map(r=>{const top=Object.entries(r.subjects).sort((a,b)=>b[1].count-a[1].count).slice(0,3).map(([k,s])=>`${SUBJECTS[k]} ${n(s.count)}곳`).join(', ');
    return `<item><title>${esc(`${r.name} 학원 ${n(r.count)}곳`)}</title><link>${SITE}/region/${r.id}</link><guid isPermaLink="true">${SITE}/region/${r.id}</guid><pubDate>${now}</pubDate><description>${esc(`${r.name} 학원·교습소 ${n(r.count)}곳(${top})과 과목별 공개 수강료`)}</description></item>`;}).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 학원</title><link>${SITE}/</link><description>우리 동네 학원·교습소와 교육청 공개 수강료</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
