import type {Place} from './types';

// RSS 2.0 of all indexable pages, newest source change (modifiedtime) first, for search engine discovery.
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
function changed(p:Place){
  const m=(p.source_modified_at||'').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  return m?new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+09:00`):new Date(p.updated_at);
}

export function rssXml(items:Place[],origin:string,limit=Infinity){
  const latest=items.filter(p=>p.indexable).map(p=>({p,at:changed(p)})).filter(x=>!isNaN(+x.at)).sort((a,b)=>+b.at-+a.at).slice(0,limit);
  const entries=latest.map(({p,at})=>{
    const url=`${origin}${p.kind==='festival'?'/festival/':'/place/'}${p.id}`;
    const text=(p.description||'').slice(0,200)+((p.description||'').length>200?'…':'');
    return `<item><title>${esc(p.name)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><pubDate>${at.toUTCString()}</pubDate><category>${p.kind==='festival'?'축제·행사':'가볼만한곳'}</category><description>${esc(`${p.region_name} · ${text}`)}</description></item>`;
  }).join('');
  const built=latest[0]?.at??new Date(0);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>여행정보</title><link>${origin}/</link><description>지역과 날짜로 찾는 여행지·축제 정보</description><language>ko</language><lastBuildDate>${built.toUTCString()}</lastBuildDate><atom:link href="${origin}/rss.xml" rel="self" type="application/rss+xml"/>${entries}</channel></rss>\n`;
}
