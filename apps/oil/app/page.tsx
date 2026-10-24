import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {NearCheap} from './_components/NearCheap';
import {StationList} from './_components/StationList';
import {Trend} from './_components/Trend';
import {change,cheapest,diff,history,n,nation,regions,sidos,SITE,slim,status,tank,updated,won,type Prod} from '../lib/data';
import {FavList} from '@guidejung/ui/favlist';

export const metadata:Metadata={alternates:{canonical:'/'}};
const Avg=({label,p}:{label:string;p:string})=>{const a=nation[p];return a?.price?<div><span>전국 평균 {label}</span><b>{won(a.price)}</b>
  {a.diff!=null&&<small className={a.diff>=0.05?'up':a.diff<=-0.05?'down':''}>어제보다 {change(a.diff)}</small>}</div>:null;};
export default function Home(){
  const g=nation.B027?.price??null,d=nation.D047?.price??null;
  const top=cheapest('B027',10),topD=cheapest('D047',5);
  const bySido=[...sidos].filter(s=>s.B027?.price).sort((a,b)=>a.B027!.price!-b.B027!.price!);
  const cheapR=[...regions].filter(r=>r.avg.B027?.price).sort((a,b)=>a.avg.B027!.price!-b.avg.B027!.price!);
  const trend=history.filter(h=>h.B027).slice(-7).map(h=>({date:h.date,price:h.B027!}));
  const gap=top[0]&&g?g-(top[0].prices.B027??g):0;
  return <div className="page oi-home">
    <section className="oi-hero"><h1>기름값 제일 싼 곳 어디?</h1>
      <p>오늘 전국 평균 휘발유 <b>{won(g)}</b> · 경유 <b>{won(d)}</b>. 시군구마다 가장 싼 주유소 20곳씩, 전국 <b>{n(status.stations)}곳</b>의 오늘 가격으로 내 주변 최저가를 찾아 드려요.</p></section>
    <FavList hint="주유소 상세에서 ☆ 즐겨찾기를 누르면 여기서 바로 오늘 가격을 볼 수 있어요."/>
    <NearCheap avg={{B027:g,D047:d} as Record<Prod,number|null>}/>
    <div className="oi-avg"><Avg label="휘발유" p="B027"/><Avg label="경유" p="D047"/><Avg label="고급휘발유" p="B034"/></div>
    <AdSlot/>
    <section><h2>오늘 전국에서 가장 싼 휘발유 TOP 10</h2>
      {gap>0&&<p className="muted">1위는 전국 평균보다 리터당 {won(gap)} 싸요 — 60L 가득 넣으면 {won(tank(gap))} 차이.</p>}
      <StationList items={top.map(slim)} avg={g} avgLabel="전국 평균"/></section>
    <section><h2>최근 7일 전국 평균 휘발유</h2><Trend rows={trend}/></section>
    <section><h2>시도별 평균 기름값 (싼 순)</h2>
      <table className="oi-table"><thead><tr><th>시도</th><th className="num">휘발유</th><th className="num">경유</th></tr></thead>
        <tbody>{bySido.map(s=><tr key={s.code}><td><Link href={`/region#${s.code}`}>{s.name}</Link></td><td className="num">{won(s.B027?.price)}</td><td className="num"><Link href={`/diesel/${s.code}`}>{won(s.D047?.price)}</Link></td></tr>)}</tbody></table></section>
    <section><h2>평균 휘발유가 싼 시군구 TOP 8</h2>
      <ol className="oi-rank">{cheapR.slice(0,8).map(r=><li key={r.code}><Link href={`/region/${r.code}`}><b>{r.label}</b><span>{won(r.avg.B027!.price)}</span></Link></li>)}</ol></section>
    <section><h2>경유 가장 싼 곳</h2><StationList items={topD.map(slim)} prod="D047" avg={d} avgLabel="전국 평균"/><p><Link href="/diesel" className="oi-more-link">시도별 경유 최저가 보기 →</Link></p></section>
    <Faq items={[
      ['오늘 전국 평균 휘발유 가격은 얼마인가요?',`${updated()} 기준 전국 평균 휘발유는 리터당 ${won(g)}, 경유는 ${won(d)}입니다(한국석유공사 오피넷).`],
      ['오늘 가장 싼 휘발유 주유소는 어디인가요?',top[0]?`${updated()} 기준 ${top[0].name}(${top[0].address??''})이 리터당 ${won(top[0].prices.B027)}으로 가장 쌉니다.`:'오늘 자료가 아직 없습니다.'],
      ['기름값이 가장 싼 시도는 어디인가요?',bySido.length?`휘발유 평균은 ${bySido.slice(0,3).map(s=>`${s.name} ${won(s.B027!.price)}`).join(', ')} 순으로 쌉니다.`:'자료가 없습니다.'],
      ['가격은 얼마나 자주 바뀌나요?','주유소 가격은 하루에도 바뀔 수 있습니다. 이 사이트는 하루 한 번 오피넷 가격을 받아 보여 드리므로, 주유 전 현장 가격을 확인하세요.'],
    ]}/>
    <Connect items={genericFor('oil')}/>
    <JsonLd data={breadcrumbLd([['내근처 주유소',SITE+'/']])}/>
  </div>;
}
