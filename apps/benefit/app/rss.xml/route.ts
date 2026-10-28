import {benefitPath,esc,items,newest,scopeLabel,SITE,status} from '../../lib/data';
export const dynamic='force-static';
export function GET(){
  const list=newest(items,100);
  const body=list.map(i=>`<item><title>${esc(`${i.name} (${scopeLabel(i)})`)}</title><link>${SITE}${benefitPath(i.id)}</link><guid>${SITE}${benefitPath(i.id)}</guid><pubDate>${new Date(`${i.reg}T09:00:00+09:00`).toUTCString()}</pubDate><description>${esc((i.sum??i.target??'').slice(0,200))}</description></item>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>내근처 혜택 — 새로 생긴 지원금·혜택</title><link>${SITE}</link><description>정부24에 새로 등록된 정부·지자체 혜택</description><language>ko</language><lastBuildDate>${new Date(status.updated_at).toUTCString()}</lastBuildDate>${body}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
