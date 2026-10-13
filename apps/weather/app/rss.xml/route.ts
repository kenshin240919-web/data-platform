import {label,regions,sidos,SITE} from '../../lib/regions';
// RSS 2.0 of every weather page for search engine discovery (Naver·Google). Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date().toUTCString();
  const pages:[string,string,string,string][]=[
    ['/weekend','이번 주말 전국 날씨','이번 주말 토요일·일요일 전국 날씨와 비 올 확률이 낮은 지역 순위','주말 날씨'],
    ['/air','오늘 전국 미세먼지','전국 미세먼지·초미세먼지 실시간 순위, 공기 깨끗한 곳과 나쁜 곳 TOP 10','미세먼지'],
    ['/warnings','기상특보 현황','지금 발효 중인 기상특보와 예비특보','기상특보'],
    ['/wear','오늘 뭐 입지? 기온별 옷차림','오늘 기온에 맞는 옷차림 추천과 기온별 옷차림 표','옷차림'],
    ...sidos.map(s=>[`/region/${s.code}`,`${s.name} 날씨`,`${s.name} ${s.regions.length}개 시군구의 오늘·내일·주간 날씨와 미세먼지`,'시도 날씨'] as [string,string,string,string]),
    ...regions.map(r=>[`/region/${r.code}`,`${label(r)} 날씨`,`${r.sidoName} ${r.name}의 지금 날씨, 시간별·10일 예보, 미세먼지, 오늘 옷차림`,'지역 날씨'] as [string,string,string,string]),
  ];
  const items=pages.map(([path,title,desc,cat])=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><category>${esc(cat)}</category><description>${esc(desc)}</description></item>`).join('');
  const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>날씨정보</title><link>${SITE}/</link><description>전국 시군구 날씨·미세먼지·주간 예보</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`;
  return new Response(xml,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
