import Link from 'next/link';
import type {Metadata} from 'next';
import {HomeWeather} from './_components/HomeWeather';
import {Connect,genericFor} from '@guidejung/ui/network';
import {Recent} from './_components/Recent';
import {Faq} from '@guidejung/ui/seo';
import {UPDATE} from '../lib/faq';
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
    <Connect title="날씨 보고 떠나기" items={genericFor('weather')}/>
    <section className="section">
      <div className="section-heading"><div><div className="eyebrow">POPULAR</div><h2>많이 찾는 지역 날씨</h2></div></div>
      <div className="chips big">{popular.map(r=><Link key={r.code} href={`/region/${r.code}`}>{label(r)}</Link>)}</div>
    </section>
    <section className="section">
      <div className="section-heading"><div><div className="eyebrow">BY REGION</div><h2>시도별 날씨</h2></div><Link href="/region">전체 지역 보기</Link></div>
      <div className="region-links">{sidos.map(s=><Link key={s.code} href={`/region/${s.code}`}><strong>{s.short}</strong><span>{s.regions.length}개 시군구</span></Link>)}</div>
    </section>
    <Faq items={[
      ['내근처 날씨는 어떤 날씨 정보를 보여 주나요?',`전국 시도 ${sidos.length}곳과 시군구 ${regions.length}곳의 지금 날씨, 시간별·10일 예보, 미세먼지·초미세먼지, 자외선, 옷차림과 우산 필요 여부, 기상특보를 기상청·에어코리아 공식 자료로 보여 드립니다.`],
      ['내 위치 날씨는 어떻게 보나요?','처음에는 접속한 지역의 날씨를 보여 드리고, "내 위치" 카드를 누르고 위치 권한을 허용하면 가장 가까운 시군구 날씨로 바뀝니다. 위치는 브라우저에만 30분 동안 보관됩니다.'],
      UPDATE,
      ['미세먼지와 주말 날씨는 어디서 보나요?','오늘 미세먼지 페이지에서 전국 측정소의 공기 깨끗한 곳·나쁜 곳 TOP 10을, 주말 날씨 페이지에서 시도별 이번 주말 예보를 맑은 순서로 볼 수 있습니다.']]}/>
  </>;
}
