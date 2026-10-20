import {KIND_LABEL,KIND_ORDER,n,regions,schoolPath,schools,SITE,status} from '../../lib/data';
// RSS 2.0 (search engine discovery): newest schools by 개교일, then the region pages. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const fresh=[...schools].filter(s=>s.founded).sort((a,b)=>b.founded!.localeCompare(a.founded!)).slice(0,60).map(s=>{const d=new Date(`${s.founded!.slice(0,4)}-${s.founded!.slice(4,6)}-${s.founded!.slice(6,8)}T09:00:00+09:00`).toUTCString();
    return `<item><title>${esc(`${s.region_name} ${s.name} 급식·학사일정`)}</title><link>${SITE}${schoolPath(s.code)}</link><guid isPermaLink="true">${SITE}${schoolPath(s.code)}</guid><pubDate>${d}</pubDate><description>${esc(`${s.region_name} ${s.name}(${s.kind}) 오늘 급식·이번 주 급식·학사일정·시간표`)}</description></item>`;}).join('');
  const items=fresh+regions.map(r=>`<item><title>${esc(`${r.name} 학교 ${n(r.count)}곳`)}</title><link>${SITE}/region/${r.id}</link><guid isPermaLink="true">${SITE}/region/${r.id}</guid><pubDate>${now}</pubDate><description>${esc(`${r.name} ${KIND_ORDER.filter(k=>r.kinds[k]).map(k=>`${KIND_LABEL[k]} ${n(r.kinds[k])}곳`).join('·')} 급식·학사일정`)}</description></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내 학교</title><link>${SITE}/</link><description>우리 학교 오늘 급식·학사일정·시간표</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
