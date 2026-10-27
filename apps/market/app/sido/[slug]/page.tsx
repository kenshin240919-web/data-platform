import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {MarketCard} from '../../_components/Cards';
import {Ad} from '../../_components/Ad';
import {baseLabel,CAT_ORDER,CATS,eun,n,pct,SITE,sido,sidos,status,topCats} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return sidos.map(s=>({slug:s.slug}));}
type P={params:Promise<{slug:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const s=sido((await params).slug);if(!s)return {};
  const t=s.markets[0];
  return {title:`${s.full} 온누리상품권 사용처 가맹점 ${n(s.n)}곳`,description:`${s.full} 온누리상품권 사용처 ${n(s.n)}곳(전통시장·상점가 ${n(s.markets.length)}곳, 디지털 ${pct(s.d,s.n)}%). 가맹점 많은 곳: ${s.markets.slice(0,3).map(m=>m.name).join('·')}${t?'':''}. 시군구·품목별로 찾아보세요.`.slice(0,160),alternates:{canonical:`/sido/${s.slug}`}};
}
export default async function SidoPage({params}:P){
  const s=sido((await params).slug);if(!s)notFound();
  const top=topCats(s.cats,4),max=Math.max(...CAT_ORDER.map(c=>s.cats[c]));
  const avg=Math.round(s.n/Math.max(1,s.markets.length));
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › {s.full}</nav>
    <h1>{s.full} 온누리상품권 사용처 가맹점</h1>
    <div className="mk-stats"><div><b>{n(s.n)}</b><small>전체 가맹점</small></div><div><b>{n(s.markets.length)}</b><small>시장·상점가</small></div><div><b>{n(s.d)}</b><small>디지털도 되는 곳</small></div><div><b>{pct(s.d,s.n)}%</b><small>디지털 비율</small></div></div>
    <p className="mk-lead">{eun(s.full)} 온누리상품권을 쓸 수 있는 가맹점이 {n(s.n)}곳 등록돼 있어요({baseLabel(status.base)} 기준). {n(s.markets.length)}개 전통시장·상점가에 시장당 평균 {n(avg)}곳이 있고, 가맹점이 가장 많은 곳은 {s.markets.slice(0,3).map(m=>`${m.name}(${n(m.n)}곳)`).join(', ')}이에요. {n(s.d)}곳({pct(s.d,s.n)}%)은 디지털(모바일·카드) 온누리상품권도 받아요.{top.length?` 품목은 ${top.map(c=>`${CATS[c].label} ${n(s.cats[c])}곳`).join(', ')} 순이에요.`:''}</p>
    {s.regions.length>0&&<section><h2>시군구별</h2><div className="mk-regions">{[...s.regions].sort((a,b)=>b.n-a.n).map(r=><Link key={r.id} href={`/region/${r.id}`}>{r.zone}<span>{n(r.n)}곳</span></Link>)}</div></section>}
    <section><h2>품목별 가맹점</h2><div className="mk-bars">{CAT_ORDER.filter(c=>s.cats[c]>0).sort((a,b)=>s.cats[b]-s.cats[a]).map(c=><Link key={c} href={`/item/${c}`}><b>{CATS[c].icon} {CATS[c].label}</b><i style={{width:`${Math.max(2,s.cats[c]/max*100)}%`}}/><span>{n(s.cats[c])}곳</span></Link>)}</div></section>
    <Ad/>
    <section><h2>시장·상점가별 가맹점 <span className="muted">{n(s.markets.length)}곳</span></h2><div className="mk-cards">{s.markets.slice(0,60).map(m=><MarketCard key={m.id} m={m}/>)}</div>
      {s.markets.length>60&&<details><summary className="mk-more-link">나머지 {n(s.markets.length-60)}곳 보기</summary><div className="mk-cards">{s.markets.slice(60).map(m=><MarketCard key={m.id} m={m}/>)}</div></details>}</section>
    <Faq title={`${s.full} 온누리상품권 자주 묻는 질문`} items={[
      [`${s.full} 온누리상품권 사용처는 몇 곳인가요?`,`${baseLabel(status.base)} 기준 ${n(s.n)}곳이에요(전통시장·상점가 ${n(s.markets.length)}곳).`],
      [`${s.full}에서 온누리상품권 가맹점이 가장 많은 곳은?`,s.markets.slice(0,5).map(m=>`${m.name} ${n(m.n)}곳`).join(', ')+'이에요.'],
      [`${s.full}에서 디지털 온누리상품권 되는 곳은?`,`${n(s.d)}곳(${pct(s.d,s.n)}%)이 디지털형(모바일·카드)도 가맹했어요. 시장 페이지에서 ‘디지털 되는 곳’만 골라 볼 수 있어요.`],
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/'],['지역별',SITE+'/region'],[s.full,`${SITE}/sido/${s.slug}`]])}/>
  </div>;
}
