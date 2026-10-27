import {COND_MIN,docs,KIND_ORDER,KINDS,n,regions,SITE,status} from '../../lib/data';
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=[...KIND_ORDER.map(k=>item(`내 주변 ${KINDS[k].title}`,`/${k}`,KINDS[k].desc)),item('주말·공휴일 발급기','/weekend','토·일·공휴일에도 서류를 떼는 무인민원발급기'),item('무인 프린트','/print','정부24 서류를 뽑을 곳'),
    ...docs.filter(d=>d.count).map(d=>item(`${d.title} 떼는 곳`,`/doc/${d.slug}`,d.tip)),
    ...regions.flatMap(r=>[item(`${r.name} 무인민원발급기 ${n(r.kinds.kiosk)}대`,`/region/${r.id}`,`${r.name} 주민센터 ${n(r.kinds.office)}곳·우체국 ${n(r.kinds.post)}곳`),
      ...KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>item(`${r.name} ${KINDS[k].title} ${n(r.kinds[k])}곳`,`/region/${r.id}/${k}`,`${r.name} ${KINDS[k].desc}`))])].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 서류</title><link>${SITE}/</link><description>내 주변 무인민원발급기·주민센터·구청 민원실·여권 발급·우체국·무인 프린트</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
