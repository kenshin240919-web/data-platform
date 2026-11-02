import {COND_MIN,KIND_ORDER,KINDS,n,regions,SITE,status} from '../../lib/data';
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=[...KIND_ORDER.map(k=>item(`내 주변 ${KINDS[k].title}`,`/${k}`,KINDS[k].desc)),item('상황별 안내','/guide','일을 그만뒀을 때·일당 일자리·경력단절·어르신·청년'),
    ...regions.flatMap(r=>[item(`${r.name} 관할 고용센터·직업소개소 ${n(r.kinds.agency+r.kinds.free)}곳`,`/region/${r.id}`,`${r.name} 새일센터 ${n(r.kinds.women)}곳·노인일자리 기관 ${n(r.kinds.senior)}곳`),
      ...KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>item(`${r.name} ${KINDS[k].title} ${n(r.kinds[k])}곳`,`/region/${r.id}/${k}`,`${r.name} ${KINDS[k].desc}`))])].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 일자리</title><link>${SITE}/</link><description>내 관할 고용센터·직업소개소·새일센터·노인일자리 기관</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
