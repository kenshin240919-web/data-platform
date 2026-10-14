import {label,regions,sidos,SITE} from '../../lib/regions';
// RSS 2.0 of every charge page for search engine discovery. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date().toUTCString();
  const pages=[...sidos.map(s=>[`/region/${s.code}`,`${s.name} 전기차 충전소`,`${s.name} 시군구별 전기차 충전소와 실시간 이용 가능 충전기`]),
    ...regions.map(r=>[`/region/${r.code}`,`${label(r)} 전기차 충전소`,`${r.sidoName} ${r.name} 충전소 위치와 지금 비어 있는 급속·완속 충전기`])];
  const items=pages.map(([p,t,d])=>`<item><title>${esc(t)}</title><link>${SITE}${p}</link><guid isPermaLink="true">${SITE}${p}</guid><pubDate>${now}</pubDate><description>${esc(d)}</description></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>충전소정보</title><link>${SITE}/</link><description>전국 전기차 충전소 실시간 이용 가능 정보</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
