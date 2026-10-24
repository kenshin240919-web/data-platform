import {SITUATIONS} from '../../lib/situations';
import {SITE} from '../../lib/site';
// RSS 2.0 (search engine discovery): home and situation pages. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date().toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=[item('내 주변 한눈에','/','날씨·문 연 약국·진료 중인 병원·최저가 주유소·무료 주차장·충전기·가볼만한곳'),...SITUATIONS.map(s=>item(s.h1,`/situation/${s.slug}`,s.desc))].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처</title><link>${SITE}/</link><description>내 주변, 지금 한 번에</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
