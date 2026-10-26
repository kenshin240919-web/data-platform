import {COND_MIN,KIND_ORDER,KINDS,n,nation,regions,SITE,status} from '../../lib/data';
// RSS 2.0 (search engine discovery): kind, 24h, region and region×kind pages. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=[item(`24시 동물병원 ${n(nation.h24)}곳`,'/24h','이름에 24가 든 동물병원 전국 목록'),...KIND_ORDER.map(k=>item(`내 주변 ${KINDS[k].title}`,`/${k}`,KINDS[k].desc)),item('우리 아이 아플 때','/guide','동물병원 가기 전 순서와 24시 동물병원 찾기'),
    ...regions.flatMap(r=>[item(`${r.name} 동물병원 ${n(r.kinds.hospital)}곳`,`/region/${r.id}`,`${r.name} 24시 ${n(r.h24)}곳·동물약국 ${n(r.kinds.pharmacy)}곳·펫호텔 ${n(r.kinds.hotel)}곳`),
      ...KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>item(`${r.name} ${KINDS[k].title} ${n(r.kinds[k])}곳`,`/region/${r.id}/${k}`,`${r.name} ${KINDS[k].desc}`))])].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 동물병원</title><link>${SITE}/</link><description>내 주변 동물병원·24시 동물병원·동물약국·펫호텔·애견 카페·펫택시</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
