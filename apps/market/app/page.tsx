import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {NearMarket} from './_components/NearMarket';
import {MarketCard} from './_components/Cards';
import {Ad} from './_components/Ad';
import {JangToday} from './_components/Jang';
import {baseLabel,CAT_ORDER,CATS,markets,n,nation,pct,SITE,sidos,status,updated} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const top=[...markets].sort((a,b)=>b.n-a.n).slice(0,10);
  const base=baseLabel(status.base);
  return <div className="page mk-home">
    <section className="mk-hero"><h1>온누리상품권 어디서 써?</h1>
      <p>내 주변 <b>온누리 가맹점</b>을 품목별로</p></section>
    <div className="mk-stats">
      <div><b>{n(nation.n)}</b><small>전체 가맹점</small></div>
      <div><b>{n(nation.markets)}</b><small>시장·상점가</small></div>
      <div><b>{n(nation.d)}</b><small>디지털(모바일·카드)도 되는 곳 · {pct(nation.d,nation.n)}%</small></div>
      <div><b>{n(nation.new)}</b><small>{status.latest_year}년 새로 가맹</small></div>
    </div>
    <p className="muted small gj-facts">전국 온누리상품권 가맹점 <b>{n(nation.n)}곳</b>(전통시장·상점가 {n(nation.markets)}곳)을 내 주변부터, 품목별로 찾아 드려요. {base} 기준 소상공인시장진흥공단 공식 가맹점 목록이에요.</p>
    <JangToday/>
    <NearMarket/>
    <Ad/>
    <section><h2>품목으로 찾기</h2><div className="mk-cats">{CAT_ORDER.filter(c=>c!=='etc').map(c=><Link key={c} href={`/item/${c}`}><span aria-hidden="true">{CATS[c].icon}</span><span><b>{CATS[c].label}</b><small>{n(nation.cats[c])}곳</small></span></Link>)}</div></section>
    <section><h2>시도별 온누리상품권 사용처</h2><div className="mk-sidos">{sidos.map(s=><Link key={s.slug} href={`/sido/${s.slug}`}><b>{s.full}</b><em>{n(s.n)}</em><small>시장·상점가 {n(s.markets.length)}곳 · 디지털 {pct(s.d,s.n)}%</small></Link>)}</div></section>
    <section><h2>가맹점이 가장 많은 시장·상점가</h2><div className="mk-cards">{top.map(m=><MarketCard key={m.id} m={m}/>)}</div></section>
    <section className="mk-guide"><h2>온누리상품권, 이렇게 확인하세요</h2><ol>
      <li><b>지류형(종이)과 디지털형(모바일·카드)은 쓰는 곳이 조금 달라요.</b> 이 목록의 가맹점은 모두 지류형 가맹점이고, {n(nation.d)}곳({pct(nation.d,nation.n)}%)은 디지털형도 받아요. 가게마다 ‘📱 디지털’·‘지류만’으로 표시했어요.</li>
      <li><b>위치는 소속 전통시장·상점가 기준이에요.</b> 공식 목록에 가게 주소가 없어서, 가게를 누르면 지도에서 이름으로 위치를 찾아 드려요.</li>
      <li><b>결제 전에 가게에 한 번 더 확인하세요.</b> 가맹 등록·해지가 수시로 바뀌어요. <Link href="/guide">온누리상품권 안내 →</Link></li>
    </ol></section>
    <Faq items={[
      ['온누리상품권 사용처는 어디인가요?',`${base} 기준 전국 ${n(nation.n)}곳의 가맹점(전통시장·골목형상점가 등 ${n(nation.markets)}곳)에서 쓸 수 있어요. 많은 품목은 음식점 ${n(nation.cats.food)}곳, 옷·신발·잡화 ${n(nation.cats.cloth)}곳, 수산·건어물 ${n(nation.cats.fish)}곳, 과일·채소 ${n(nation.cats.fruit)}곳이에요.`],
      ['내 주변 온누리상품권 가맹점은 어떻게 찾나요?','‘내 주변 온누리상품권 사용처 보기’를 누르면 가까운 시장·상점가와 가맹점 수를 거리순으로 보여 드려요. 품목 칩(음식점·카페·정육·미용 등)을 누르면 그 품목 가게만 보여요.'],
      ['디지털 온누리상품권도 쓸 수 있나요?',`가맹점 ${n(nation.n)}곳 중 ${n(nation.d)}곳(${pct(nation.d,nation.n)}%)이 디지털형(모바일·카드)도 가맹했어요. 나머지 ${n(nation.paperOnly)}곳은 지류형(종이)만 받아요.`],
      ['정보는 얼마나 정확한가요?',`소상공인시장진흥공단이 공개한 「전국 온누리상품권 가맹점 현황」(${base} 기준)을 그대로 보여 드려요. 그 뒤 새로 가맹하거나 해지한 곳은 반영되지 않았을 수 있으니 결제 전에 가게에 확인하세요.`],
    ]}/>
    <Connect items={genericFor('market')}/>
    <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/']])}/>
    <p className="muted small">공식 목록 기준일 {base} · 마지막 갱신 {updated()} · 가맹점 {n(status.count)}곳</p>
  </div>;
}
