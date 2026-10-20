import {academyPath,latest,n,regions,SITE,status,SUBJECTS,subjectLabel} from '../../lib/data';
// RSS 2.0 of the region pages (search engine discovery). Rebuilt on each deploy (daily data commit).
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  // 새로 문 연 학원(개설일 순)을 먼저 — 검색엔진이 새 상세 페이지를 빨리 찾도록.
  const fresh=latest.slice(0,60).map(a=>{const d=new Date(`${a.established.slice(0,4)}-${a.established.slice(4,6)}-${a.established.slice(6,8)}T09:00:00+09:00`).toUTCString();
    return `<item><title>${esc(`[새 학원] ${a.region_name} ${a.name}`)}</title><link>${SITE}${academyPath(a.id)}</link><guid isPermaLink="true">${SITE}${academyPath(a.id)}</guid><pubDate>${d}</pubDate><description>${esc(`${a.region_name}에 새로 문을 연 ${a.subjects.slice(0,3).map(subjectLabel).join('·')||'학원'} ${a.name}`)}</description></item>`;}).join('');
  const items=fresh+regions.map(r=>{const top=Object.entries(r.subjects).sort((a,b)=>b[1].count-a[1].count).slice(0,3).map(([k,s])=>`${SUBJECTS[k]} ${n(s.count)}곳`).join(', ');
    return `<item><title>${esc(`${r.name} 학원 ${n(r.count)}곳`)}</title><link>${SITE}/region/${r.id}</link><guid isPermaLink="true">${SITE}/region/${r.id}</guid><pubDate>${now}</pubDate><description>${esc(`${r.name} 학원·교습소 ${n(r.count)}곳(${top})과 과목별 공개 수강료`)}</description></item>`;}).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 학원</title><link>${SITE}/</link><description>우리 동네 학원·교습소와 교육청 공개 수강료</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
