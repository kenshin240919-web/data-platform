import Link from 'next/link';
import type {Metadata} from 'next';
import {HomeNearby} from './_components/HomeNearby';
import {Connect,genericFor} from '@guidejung/ui/network';
import {POPULAR,findRegion,label,regions,sidos,SITE} from '../lib/regions';
import {fmtDate,snapFetched,snapNation,snapSum,snapTotal} from '../lib/snapshot';
import {Faq} from '@guidejung/ui/seo';

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
    {snapTotal.stations>0&&(()=>{const n=snapNation();const d=fmtDate(snapFetched);
      const bySido=sidos.map(s=>({s,n:snapSum(s.regions.map(r=>r.code))})).sort((a,b)=>b.n.stations-a.n.stations);
      const top=n.topFast.map(t=>{const r=findRegion(t.code);return r?`${label(r)}(급속 ${t.fast.toLocaleString()}대)`:null;}).filter(Boolean);
      return <Faq items={[
        ['전국 전기차 충전소는 몇 곳인가요?',`${d} 한국환경공단 자료 기준 전국 충전소 ${snapTotal.stations.toLocaleString()}곳, 충전기 ${snapTotal.chargers.toLocaleString()}대이며 이 가운데 급속 충전기는 ${n.fast.toLocaleString()}대입니다.`],
        ['전기차 충전소가 가장 많은 시도는 어디인가요?',bySido.slice(0,3).map(x=>`${x.s.name}(${x.n.stations.toLocaleString()}곳)`).join(', ')+' 순입니다.'],
        ['급속 충전기가 많은 시군구는 어디인가요?',top.join(', ')+' 순입니다.'],
        ['24시간·무료 주차 충전소는 얼마나 있나요?',`24시간 이용할 수 있는 충전소는 ${n.h24.toLocaleString()}곳, 무료 주차가 되는 충전소는 ${n.freeParking.toLocaleString()}곳입니다. 지역 페이지의 조건 버튼으로 골라 볼 수 있습니다.`],
        ['지금 비어 있는 충전기는 어떻게 아나요?','한국환경공단 충전기 상태 정보를 5분마다 받아 충전소마다 지금 사용 가능한 급속·완속 충전기 수를 보여 드립니다. 위치를 허용하면 가까운 순으로 보여 드립니다.']]}/>;})()}
  </>;
}
