import {SITE,rests,roadName,routes} from '../../lib/data';
// RSS 2.0 of every traffic page for search engine discovery. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date().toUTCString();
  const pages=[['/gas','고속도로 휴게소 기름값 순위','전국 휴게소 주유소 휘발유·경유 싼 순서'],['/incidents','고속도로 사고·공사 실시간','진행 중인 사고·공사·차로 통제'],
    ...routes.map(r=>[`/road/${r.no}`,`${roadName(r)} 실시간 교통상황`,`${r.start}~${r.end} 구간별 정체·속도와 휴게소`]),
    ...rests.map(r=>[`/rest/${r.code}`,`${r.name} 대표 음식·기름값`,`${roadName({name:r.route})} ${r.name} 음식 메뉴·주유 가격·편의시설`])];
  const items=pages.map(([p,t,d])=>`<item><title>${esc(t)}</title><link>${SITE}${p}</link><guid isPermaLink="true">${SITE}${p}</guid><pubDate>${now}</pubDate><description>${esc(d)}</description></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 고속도로</title><link>${SITE}/</link><description>전국 고속도로 실시간 정체·휴게소·기름값</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
