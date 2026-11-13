import {COND_MIN,KIND_ORDER,KINDS,n,regions,SITE,status} from '../../lib/data';
import {MIN_WAGES,won} from '../../lib/calc';
import {YE_YEAR} from '../../lib/yearend';
import {CASE_ORDER,CASES,PAYS,scenarios} from '../../lib/yearendPages';
export const dynamic='force-static';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'})[c]!);
export function GET(){
  const now=new Date(status.updated_at).toUTCString();
  const item=(title:string,path:string,desc:string)=>`<item><title>${esc(title)}</title><link>${SITE}${path}</link><guid isPermaLink="true">${SITE}${path}</guid><pubDate>${now}</pubDate><description>${esc(desc)}</description></item>`;
  const items=[...KIND_ORDER.map(k=>item(`내 주변 ${KINDS[k].title}`,`/${k}`,KINDS[k].desc)),item('상황별 안내','/guide','일을 그만뒀을 때·일당 일자리·경력단절·어르신·청년'),
    item(`${YE_YEAR} 연말정산 계산기`,'/calc/yearend','연봉·부양가족·카드·연금저축·월세로 세금과 환급 어림'),
    ...CASE_ORDER.map(k=>item(CASES[k].title,`/calc/yearend/${k}`,CASES[k].h1)),
    ...PAYS.map(v=>item(`연봉 ${v.toLocaleString('ko-KR')}만 원 연말정산`,`/calc/yearend/${v}`,`${YE_YEAR}년 귀속 내야 할 세금 약 ${won(scenarios(v*1e4).base.total)}`)),
    ...Object.keys(MIN_WAGES).map(y=>item(`${y} 최저임금 ${MIN_WAGES[+y].hourly.toLocaleString('ko-KR')}원 월급·주휴수당`,`/calc/minimum-wage/${y}`,'주 40시간 월급과 아르바이트 시간별 월급')),
    ...regions.flatMap(r=>[item(`${r.name} 관할 고용센터·직업소개소 ${n(r.kinds.agency+r.kinds.free)}곳`,`/region/${r.id}`,`${r.name} 새일센터 ${n(r.kinds.women)}곳·노인일자리 기관 ${n(r.kinds.senior)}곳`),
      ...KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>item(`${r.name} ${KINDS[k].title} ${n(r.kinds[k])}곳`,`/region/${r.id}/${k}`,`${r.name} ${KINDS[k].desc}`))])].join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>내근처 일자리</title><link>${SITE}/</link><description>내 관할 고용센터·직업소개소·새일센터·노인일자리 기관</description><language>ko</language><lastBuildDate>${now}</lastBuildDate><atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>\n`,{headers:{'Content-Type':'application/rss+xml; charset=utf-8'}});
}
