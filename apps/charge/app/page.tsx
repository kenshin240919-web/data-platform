import Link from 'next/link';
import type {Metadata} from 'next';
import {HomeNearby} from './_components/HomeNearby';
import {Connect,genericFor} from '@guidejung/ui/network';
import {POPULAR,findRegion,label,regions,sidos,SITE} from '../lib/regions';
import {fmtDate,snapFetched,snapSum,snapTotal} from '../lib/snapshot';

export const metadata:Metadata={alternates:{canonical:SITE+'/'}};
export default function Home(){
  const list=regions.map(r=>({...r,label:label(r)})).sort((a,b)=>a.label.localeCompare(b.label,'ko'));
  const popular=POPULAR.map(findRegion).filter((r):r is NonNullable<typeof r>=>!!r);
  return <>
    <section className="section"><h1>내 주변 전기차 충전소</h1>{snapTotal.stations>0&&<p className="muted small">전국 충전소 {snapTotal.stations.toLocaleString()}곳 · 충전기 {snapTotal.chargers.toLocaleString()}대의 실시간 상태 ({fmtDate(snapFetched)} 기준 목록)</p>}<HomeNearby regions={list} fallback="11140"/></section>
    <Connect title="충전하는 동안 함께 보기" items={genericFor('charge')}/>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">POPULAR</div><h2>많이 찾는 지역 충전소</h2></div></div>
      <div className="chips big">{popular.map(r=><Link key={r.code} href={`/region/${r.code}`}>{label(r)}</Link>)}</div></section>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">BY REGION</div><h2>시도별 충전소</h2></div><Link href="/region">전체 지역 보기</Link></div>
      <div className="region-links">{sidos.map(s=><Link key={s.code} href={`/region/${s.code}`}><strong>{s.short}</strong><span>{(()=>{const n=snapSum(s.regions.map(r=>r.code));return n.stations?`충전소 ${n.stations.toLocaleString()}곳`:`${s.regions.length}개 시군구`;})()}</span></Link>)}</div></section>
  </>;
}
