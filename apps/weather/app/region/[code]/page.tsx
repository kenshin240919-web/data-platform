import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {WeatherPanel} from '../../_components/WeatherPanel';
import {Recent} from '../../_components/Recent';
import {findRegion,findSido,label,nearby,regions,sidos,SITE,TRIP} from '../../../lib/regions';

export const dynamicParams=false;
export function generateStaticParams(){return [...sidos.map(s=>({code:s.code})),...regions.map(r=>({code:r.code}))];}
type Props={params:Promise<{code:string}>};

export async function generateMetadata(props:Props):Promise<Metadata>{
  const {code}=await props.params;const s=findSido(code);const r=findRegion(code);
  const name=s?s.name:r?label(r):'';
  return {title:`${name} 날씨 - 오늘·내일·주간 예보, 미세먼지`,
    description:`${name}의 지금 날씨와 시간별 예보, 10일 예보, 미세먼지, 오늘 옷차림과 우산 여부를 기상청 공식 예보로 확인하세요.`,
    alternates:{canonical:`${SITE}/region/${code}`},openGraph:{title:`${name} 날씨`,url:`${SITE}/region/${code}`}};
}

export default async function RegionPage(props:Props){
  const {code}=await props.params;
  const s=findSido(code);
  if(s){const cap=s.capital;
    return <section className="section">
      <nav className="breadcrumbs" aria-label="현재 위치"><Link href="/">날씨</Link><span>/</span><Link href="/region">전국</Link><span>/</span><span>{s.name}</span></nav>
      <div className="eyebrow">REGION</div><h1>{s.name} 날씨</h1>
      <p className="muted">{s.name} {s.regions.length}개 시군구의 날씨를 확인하세요. 아래는 {label(cap)} 기준 날씨입니다.</p>
      <div className="chips">{s.regions.map(r=><Link key={r.code} href={`/region/${r.code}`}>{r.name}</Link>)}</div>
      <WeatherPanel region={cap} label={label(cap)}/>
      <div className="section-heading"><h2>다른 시도 날씨</h2></div>
      <div className="chips">{sidos.filter(x=>x.code!==s.code).map(x=><Link key={x.code} href={`/region/${x.code}`}>{x.short}</Link>)}</div>
    </section>;}
  const r=findRegion(code);if(!r)notFound();
  const name=label(r);const sido=findSido(r.sido);const near=nearby(r);
  return <section className="section">
    <nav className="breadcrumbs" aria-label="현재 위치"><Link href="/">날씨</Link><span>/</span><Link href={`/region/${r.sido}`}>{r.sidoName}</Link><span>/</span><span>{r.name}</span></nav>
    <h1>{name} 날씨</h1>
    <p className="muted small">{r.sidoName} {r.name} · 기상청 단기예보 격자 {r.nx},{r.ny} · 미세먼지 {r.stations[0]} 측정소 인근</p>
    <Recent exclude={r.code}/>
    <WeatherPanel region={r} label={name}/>
    <div className="section-heading"><h2>{name} 주변 지역 날씨</h2></div>
    <div className="chips big">{near.map(x=><Link key={x.code} href={`/region/${x.code}`}>{label(x)}</Link>)}</div>
    {sido&&<><div className="section-heading"><h2>{sido.name} 다른 지역</h2><Link href={`/region/${sido.code}`}>{sido.short} 전체</Link></div>
      <div className="chips">{sido.regions.filter(x=>x.code!==r.code).map(x=><Link key={x.code} href={`/region/${x.code}`}>{x.name}</Link>)}</div></>}
    {!r.trip&&<p className="muted small"><a href={TRIP}>여행정보</a>에서 전국 가볼만한곳을 찾아보세요.</p>}
  </section>;
}
