import Link from 'next/link';
import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {HomeLive} from './_components/HomeLive';
import {NearMe} from './_components/NearMe';
import {RouteCards} from './_components/RouteCards';
import {MAJOR,SITE,cheapGas,findRoute,fmtDate,fetched,roadName,routes,rests} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:SITE+'/'}};
export default function Home(){
  const major=MAJOR.map(findRoute).filter((r):r is NonNullable<typeof r>=>!!r);
  const gas=cheapGas().slice(0,5);
  const lite=rests.map(r=>({code:r.code,name:r.name,routeNo:r.routeNo,lat:r.lat,lng:r.lng,dir:r.dir,gas:r.gas?.gasoline??'',food:(r.foods.find(f=>f.best)??r.foods[0])?.name??''}));
  const foods=rests.filter(r=>r.foods.some(f=>f.best)).slice(0,60).filter((_,i)=>i%6===0).slice(0,6);
  return <>
    <section className="section tf-top-sec"><h1>고속도로 실시간 교통상황</h1></section>
    <NearMe routes={routes} rests={lite}/>
    <section className="section"><HomeLive routes={routes}/></section>
    <AdSlot/>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">HIGHWAYS</div><h2>주요 고속도로</h2></div><Link href="/road">전체 {routes.length}개 노선</Link></div><RouteCards routes={major}/></section>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">FUEL</div><h2>오늘 기름값 싼 휴게소</h2></div><Link href="/gas">기름값 순위 전체</Link></div>
      <ol className="tf-top">{gas.map((r,i)=><li key={r.code}><Link href={`/rest/${r.code}`}><span className="tf-rank">{i+1}</span><span className="tf-zname"><b>{r.name}</b><small>{roadName({name:r.route})} · {r.area}</small></span><span className="tf-speed"><b>{r.gas!.gasoline.replace('원','')}</b>원<small>휘발유</small></span></Link></li>)}</ol>
      <p className="muted small">한국도로공사 휴게소 주유소 가격 · {fmtDate(fetched)} 기준</p></section>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">FOOD</div><h2>휴게소 대표 음식</h2></div><Link href="/rest">휴게소 전체</Link></div>
      <div className="tf-cards">{foods.map(r=>{const f=r.foods.find(x=>x.best)!;return <Link key={r.code} href={`/rest/${r.code}`} className="tf-card"><span className="tf-card-title">{r.name}</span><strong>{f.name}</strong><small>{Number(f.cost)?`${Number(f.cost).toLocaleString()}원 · `:''}{roadName({name:r.route})}</small></Link>;})}</div></section>
  </>;
}
