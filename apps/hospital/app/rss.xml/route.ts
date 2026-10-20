import {DEPTS,MIN_DEPT,n,regions,SITE,status} from '../../lib/data';
// RSS 2.0 (search engine discovery): region and region×진료과목 pages. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=regions.flatMap(r=>[item(`${r.name} 병원 ${n(r.count)}곳`,`/region/${r.id}`,`${r.name} 지금 진료 중·야간 ${n(r.cond.night)}곳·일요일 ${n(r.cond.sun)}곳`),
    ...Object.entries(r.depts).filter(([k,d])=>d.count>=MIN_DEPT&&['pediatrics','internal','ent','dental'].includes(k)).map(([k,d])=>item(`${r.name} ${DEPTS[k]} ${n(d.count)}곳`,`/region/${r.id}/${k}`,`${r.name} ${DEPTS[k]} 야간 ${n(d.night)}곳·일요일 ${n(d.sun)}곳`))]).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 병원</title><link>${SITE}/</link><description>지금 진료 중인 병원·야간·주말·응급실</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
