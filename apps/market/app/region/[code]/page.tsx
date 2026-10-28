import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksForCode,genericFor} from '@guidejung/ui/network';
import {MarketCard} from '../../_components/Cards';
import {Ad} from '../../_components/Ad';
import {baseLabel,CATS,eun,fairPath,fairsIn,jangLabel,n,pct,region,regionCats,regions,SITE,sidoFull,sidoSlug,status,topCats} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  return {title:`${r.name} 온누리상품권 사용처 가맹점 ${n(r.n)}곳`,description:`${r.name} 온누리상품권 사용처 ${n(r.n)}곳 — ${r.markets.slice(0,3).map(m=>m.name).join('·')} 등 전통시장·상점가 ${n(r.markets.length)}곳, 디지털 ${pct(r.d,r.n)}%. 품목별로 찾아보세요.`.slice(0,160),alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const top=topCats(r.cats,4),cats=regionCats(r),fs=fairsIn(r.id);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href={`/sido/${sidoSlug(r.sido)}`}>{sidoFull(r.sido)}</Link> › {r.zone}</nav>
    <h1>{r.name} 온누리상품권 사용처</h1>
    <div className="mk-stats"><div><b>{n(r.n)}</b><small>가맹점</small></div><div><b>{n(r.markets.length)}</b><small>시장·상점가</small></div><div><b>{n(r.d)}</b><small>디지털도 되는 곳</small></div><div><b>{n(r.new)}</b><small>{status.latest_year}년 새로 가맹</small></div></div>
    <p className="mk-lead">{eun(r.name)} 온누리상품권 가맹점이 {n(r.n)}곳이에요({baseLabel(status.base)} 기준). 가장 많은 곳은 {r.markets.slice(0,3).map(m=>`${m.name}(${n(m.n)}곳)`).join(', ')}이고{top.length?`, 품목은 ${top.map(c=>`${CATS[c].label} ${n(r.cats[c])}곳`).join(', ')} 순이에요`:'요'}. {n(r.d)}곳({pct(r.d,r.n)}%)은 디지털(모바일·카드)도 받아요.</p>
    {cats.length>0&&<section><h2>품목으로 찾기</h2><div className="mk-cats">{cats.map(c=><Link key={c} href={`/region/${r.id}/${c}`}><span aria-hidden="true">{CATS[c].icon}</span><span><b>{CATS[c].label}</b><small>{n(r.cats[c])}곳</small></span></Link>)}</div></section>}
    <section><h2>시장·상점가 <span className="muted">{n(r.markets.length)}곳</span></h2><div className="mk-cards">{r.markets.map(m=><MarketCard key={m.id} m={m}/>)}</div></section>
    {fs.length>0&&<section><h2>📅 {r.name} 5일장 장날 <span className="muted">{n(fs.length)}곳</span></h2><div className="mk-cards">{fs.map(f=><a key={f.id} className="mk-card" href={fairPath(f)}>
      <span className="mk-icon" aria-hidden="true">🧺</span><span className="mk-card-body"><b>{f.name}</b><small>{f.addr??f.jibun??''}</small></span><span className="mk-card-n"><b>{jangLabel(f)}</b><small>장날</small></span></a>)}</div>
      <p><Link className="mk-more-link" href="/jang">오늘 장 서는 5일장 보기 →</Link></p></section>}
    <Ad/>
    <Faq title={`${r.name} 온누리상품권 자주 묻는 질문`} items={[
      [`${r.name} 온누리상품권 사용처는 어디인가요?`,`${r.markets.slice(0,5).map(m=>`${m.name}(${n(m.n)}곳)`).join(', ')} 등 ${n(r.markets.length)}개 시장·상점가의 가맹점 ${n(r.n)}곳이에요.`],
      [`${r.name}에서 온누리상품권으로 장 보기 좋은 곳은?`,top.length?`가맹점 기준 ${top.map(c=>`${CATS[c].label} ${n(r.cats[c])}곳`).join(', ')}이 많아요.`:''],
      ...(fs.length?[[`${r.name} 5일장 장날은?`,fs.slice(0,6).map(f=>`${f.name} ${jangLabel(f)}`).join(', ')+(fs.length>6?` 등 ${n(fs.length)}곳이에요.`:'이에요.')] as [string,string]]:[]),
      [`${r.name}에서 디지털 온누리상품권 되는 곳은?`,`${n(r.d)}곳(${pct(r.d,r.n)}%)이 디지털형(모바일·카드)도 가맹했어요.`],
    ]}/>
    <Connect items={linksForCode(r.id,'market').length?linksForCode(r.id,'market'):genericFor('market')}/>
    <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/'],[sidoFull(r.sido),`${SITE}/sido/${sidoSlug(r.sido)}`],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
