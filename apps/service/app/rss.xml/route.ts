import {COND_MIN,KIND_ORDER,KINDS,n,regions,SITE,status} from '../../lib/data';
// RSS 2.0 (search engine discovery): region and region×kind pages. Rebuilt on each deploy.
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=[item('자동차 검사 기한·과태료 계산기','/inspection','검사 기간 마지막 날로 남은 날과 예상 과태료 계산'),item('정비 맡기기 전 체크리스트','/guide','정비소 종류·견적서·부품 확인'),
    ...regions.flatMap(r=>[item(`${r.name} 자동차 정비소 ${n(r.kinds.repair)}곳`,`/region/${r.id}`,`${r.name} 정비소·검사소 ${n(r.kinds.inspect)}곳·세차장 ${n(r.kinds.wash)}곳`),
      ...KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>item(`${r.name} ${KINDS[k].title} ${n(r.kinds[k])}곳`,`/region/${r.id}/${k}`,`${r.name} ${KINDS[k].desc}`))])].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 서비스센터</title><link>${SITE}/</link><description>내 주변 자동차 정비소·검사소·세차장</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
