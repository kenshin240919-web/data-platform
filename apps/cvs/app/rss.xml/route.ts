import {BRAND_ORDER,BRANDS,COND_MIN,n,regions,SITE,status} from '../../lib/data';
// RSS 2.0 (search engine discovery): brand, region and region×brand pages. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const brands=BRAND_ORDER.filter(k=>k!=='other');
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=[item('편의점 상비약 안내','/medicine','어디서 살 수 있나·24시간 연중 무휴·밤에 아플 때 순서'),...brands.map(b=>item(`상비약 파는 ${BRANDS[b].title}`,`/brand/${b}`,`전국 ${BRANDS[b].title} 상비약 판매 매장`)),
    ...regions.flatMap(r=>[item(`${r.name} 상비약 파는 편의점 ${n(r.count)}곳`,`/region/${r.id}`,`${r.name} 안전상비의약품 판매 편의점·마트와 가장 가까운 약국`),
      ...brands.filter(k=>r.brands[k]>=COND_MIN).map(k=>item(`${r.name} 상비약 파는 ${BRANDS[k].title} ${n(r.brands[k])}곳`,`/region/${r.id}/${k}`,`${r.name} ${BRANDS[k].title} 상비약 판매 매장`))])].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 편의점</title><link>${SITE}/</link><description>약국이 닫은 밤에도 상비약 살 수 있는 편의점</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
