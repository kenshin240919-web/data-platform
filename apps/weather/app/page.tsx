import Link from 'next/link';
import type {Metadata} from 'next';
import {HomeWeather} from './_components/HomeWeather';
import {Recent} from './_components/Recent';
import {POPULAR,findRegion,label,regions,sidos,SITE} from '../lib/regions';

export const metadata:Metadata={alternates:{canonical:SITE+'/'}};
export default function Home(){
  const slim=regions.map(r=>({...r,label:label(r)})).sort((a,b)=>a.label.localeCompare(b.label,'ko'));
  const popular=POPULAR.map(findRegion).filter((r):r is NonNullable<typeof r>=>!!r);
  return <>
    <section className="section wx-home">
      <Recent/>
      <HomeWeather regions={slim} fallback="11140"/>
    </section>
    <section className="section wx-shortcuts" aria-label="많이 보는 정보">
      <Link href="/weekend"><span aria-hidden="true">🏖️</span><b>이번 주말 날씨</b><small>전국 맑은 곳 순위</small></Link>
      <Link href="/air"><span aria-hidden="true">😷</span><b>오늘 미세먼지</b><small>깨끗한 곳·나쁜 곳 TOP 10</small></Link>
      <Link href="/wear"><span aria-hidden="true">👕</span><b>오늘 뭐 입지?</b><small>기온별 옷차림</small></Link>
    </section>
    <section className="section">
      <div className="section-heading"><div><div className="eyebrow">POPULAR</div><h2>많이 찾는 지역 날씨</h2></div></div>
      <div className="chips big">{popular.map(r=><Link key={r.code} href={`/region/${r.code}`}>{label(r)}</Link>)}</div>
    </section>
    <section className="section">
      <div className="section-heading"><div><div className="eyebrow">BY REGION</div><h2>시도별 날씨</h2></div><Link href="/region">전체 지역 보기</Link></div>
      <div className="region-links">{sidos.map(s=><Link key={s.code} href={`/region/${s.code}`}><strong>{s.short}</strong><span>{s.regions.length}개 시군구</span></Link>)}</div>
    </section>
  </>;
}
