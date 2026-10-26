import {COND_MIN,KIND_ORDER,KINDS,n,regions,SITE,status} from '../../lib/data';
// RSS 2.0 (search engine discovery): kind, region and region×kind pages. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=[...KIND_ORDER.map(k=>item(`내 주변 ${KINDS[k].title}`,`/${k}`,KINDS[k].desc)),item('이용 안내','/guide','신고된 업소 확인법과 업종별 차이'),
    ...regions.flatMap(r=>[item(`${r.name} 찜질방·목욕탕 ${n(r.kinds.sauna)}곳`,`/region/${r.id}`,`${r.name} 1인 목욕·세신 ${n(r.kinds.private)}곳·안마원 ${n(r.kinds.anma)}곳·피부관리실 ${n(r.kinds.skin)}곳`),
      ...KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>item(`${r.name} ${KINDS[k].title} ${n(r.kinds[k])}곳`,`/region/${r.id}/${k}`,`${r.name} ${KINDS[k].desc}`))])].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 휴식</title><link>${SITE}/</link><description>내 주변 찜질방·사우나·1인 목욕탕·안마원·피부관리실</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
