import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {WeatherPanel} from '../../_components/WeatherPanel';
import {Connect,linksForCode} from '@guidejung/ui/network';
import {Recent} from '../../_components/Recent';
import {Faq,JsonLd,breadcrumbLd} from '@guidejung/ui/seo';
import {findRegion,findSido,label,nearby,regions,sidos,SITE,TRIP} from '../../../lib/regions';

export const dynamicParams=false;
export function generateStaticParams(){return [...sidos.map(s=>({code:s.code})),...regions.map(r=>({code:r.code}))];}
const UPDATE:[string,string]=['날씨 예보는 언제 바뀌나요?','기상청 단기예보는 하루 8번(02·05·08·11·14·17·20·23시) 발표되고, 지금 날씨(초단기실황)는 매시간, 10일 예보(중기예보)는 하루 2번(06·18시) 갱신됩니다.'];
type Props={params:Promise<{code:string}>};

export async function generateMetadata(props:Props):Promise<Metadata>{
  const {code}=await props.params;const s=findSido(code);const r=findRegion(code);
  const name=s?s.name:r?label(r):'';
  return {title:`${name} 날씨 - 오늘·내일·주간 예보, 미세먼지`,
    description:`${name}의 지금 날씨와 시간별 예보, 10일 예보, 미세먼지, 오늘 옷차림과 우산 여부를 기상청 공식 예보로 확인하세요.`,
    alternates:{canonical:`${SITE}/region/${code}`},openGraph:{images:'/og.png',title:`${name} 날씨`,url:`${SITE}/region/${code}`}};
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
      <Connect title={`${s.short} 날씨와 함께 보기`} items={linksForCode(cap.code,'weather')}/>
      <Faq title={`${s.name} 날씨 자주 묻는 질문`} items={[[`${s.name} 날씨는 어느 지역 기준인가요?`,`${s.name} 페이지는 ${label(cap)} 기준 날씨입니다. ${s.regions.length}개 시군구는 위 지역 버튼에서 각각 확인할 수 있습니다.`],UPDATE]}/>
      <JsonLd data={breadcrumbLd([['내근처 날씨',SITE+'/'],['전국 날씨',SITE+'/region'],[s.name,`${SITE}/region/${s.code}`]])}/>
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
    <Connect title={`${name} 날씨와 함께 보기`} items={linksForCode(r.code,'weather')}/>
    <Faq title={`${name} 날씨 자주 묻는 질문`} items={[
      [`${name} 날씨는 어디 기준인가요?`,`기상청 단기예보 격자(${r.nx},${r.ny})의 예보와 에어코리아 ${r.stations[0]} 측정소의 미세먼지·초미세먼지를 보여 드립니다.`],UPDATE,
      [`${name} 오늘 우산이 필요한가요?`,`위 생활 카드가 오늘 시간별 강수확률로 우산 필요 여부를 알려 드리고, 기온에 맞는 옷차림과 미세먼지·자외선도 함께 보여 드립니다.`],
      [`${name} 근처 다른 지역 날씨는 어디서 보나요?`,`가까운 ${near.slice(0,5).map(label).join(', ')} 날씨를 아래 주변 지역 버튼에서 바로 볼 수 있습니다.`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 날씨',SITE+'/'],[r.sidoName,`${SITE}/region/${r.sido}`],[name,`${SITE}/region/${r.code}`]])}/>
    <div className="section-heading"><h2>{name} 주변 지역 날씨</h2></div>
    <div className="chips big">{near.map(x=><Link key={x.code} href={`/region/${x.code}`}>{label(x)}</Link>)}</div>
    {sido&&<><div className="section-heading"><h2>{sido.name} 다른 지역</h2><Link href={`/region/${sido.code}`}>{sido.short} 전체</Link></div>
      <div className="chips">{sido.regions.filter(x=>x.code!==r.code).map(x=><Link key={x.code} href={`/region/${x.code}`}>{x.name}</Link>)}</div></>}
    {!r.trip&&<p className="muted small"><a href={TRIP}>내근처 여행</a>에서 전국 가볼만한곳을 찾아보세요.</p>}
  </section>;
}
