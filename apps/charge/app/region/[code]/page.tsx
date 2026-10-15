import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {StationBoard} from '../../_components/StationBoard';
import {findRegion,findSido,label,nearby,regions,sidos,SITE,TRIP,WEATHER} from '../../../lib/regions';
import {fmtDate,snapFetched,snapRegion,snapSum} from '../../../lib/snapshot';
import {Connect,linksForCode,nearRoad,TRAFFIC_URL} from '@guidejung/ui/network';

export const dynamicParams=false;
export function generateStaticParams(){return [...sidos.map(s=>({code:s.code})),...regions.map(r=>({code:r.code}))];}
type Props={params:Promise<{code:string}>};
export async function generateMetadata(props:Props):Promise<Metadata>{
  const {code}=await props.params;const s=findSido(code),r=findRegion(code);const name=s?s.name:r?label(r):'';
  const n=s?snapSum(s.regions.map(x=>x.code)):r?snapRegion(r.code):null;
  const counts=n&&n.stations?`충전소 ${n.stations.toLocaleString()}곳·충전기 ${n.chargers.toLocaleString()}대(급속 ${n.fast.toLocaleString()}대). `:'';
  return {title:`${name} 전기차 충전소 - 실시간 이용 가능 충전기`,description:`${name} 전기차 ${counts}충전소 위치와 지금 비어 있는 급속·완속 충전기, 무료 주차·24시간 충전소를 실시간으로 확인하세요.`,
    alternates:{canonical:`${SITE}/region/${code}`},openGraph:{title:`${name} 전기차 충전소`,url:`${SITE}/region/${code}`}};
}
export default async function RegionPage(props:Props){
  const {code}=await props.params;
  const s=findSido(code);
  if(s)return <section className="section">
    <nav className="breadcrumbs" aria-label="현재 위치"><Link href="/">충전소</Link><span>/</span><Link href="/region">전국</Link><span>/</span><span>{s.name}</span></nav>
    <h1>{s.name} 전기차 충전소</h1><p className="muted">{s.name} {s.regions.length}개 시군구{(()=>{const n=snapSum(s.regions.map(x=>x.code));return n.stations?` · 충전소 ${n.stations.toLocaleString()}곳 · 충전기 ${n.chargers.toLocaleString()}대(급속 ${n.fast.toLocaleString()}대)`:'';})()}. 지역을 골라 지금 이용 가능한 충전기를 확인하세요.</p>
    <div className="region-links">{s.regions.map(r=>{const n=snapRegion(r.code);return <Link key={r.code} href={`/region/${r.code}`}><strong>{r.name}</strong><span>{n?`충전소 ${n.stations.toLocaleString()}곳 · 급속 ${n.fast.toLocaleString()}대`:'충전소 보기'}</span></Link>;})}</div>
    <Connect title={`${s.name} 함께 보기`} items={linksForCode(s.regions[0].weather,'charge')}/>
    <div className="section-heading"><h2>다른 시도</h2></div><div className="chips">{sidos.filter(x=>x.code!==s.code).map(x=><Link key={x.code} href={`/region/${x.code}`}>{x.short}</Link>)}</div>
  </section>;
  const r=findRegion(code);if(!r)notFound();
  const name=label(r);const sido=findSido(r.sido);
  return <section className="section">
    <nav className="breadcrumbs" aria-label="현재 위치"><Link href="/">충전소</Link><span>/</span><Link href={`/region/${r.sido}`}>{r.sidoName}</Link><span>/</span><span>{r.name}</span></nav>
    <h1>{name} 전기차 충전소</h1>
    <p className="muted small">{r.sidoName} {r.name}의 공공·민간 충전소와 충전기별 실시간 상태(한국환경공단 제공). 충전소를 누르면 충전기별 상태와 길찾기가 열립니다.</p>
    <StationBoard region={r} label={name} snap={snapRegion(r.code)} road={(rd=>rd&&rd.km<=30?`${TRAFFIC_URL}/road/${rd.no}`:undefined)(nearRoad(r.lat,r.lon))}/>
    <p className="muted small">충전소·충전기 수는 한국환경공단 자료 {fmtDate(snapFetched)} 기준이며, 사용 가능 여부는 실시간 상태입니다.</p>
    <Connect title={`${name}에서 충전하는 동안`} items={linksForCode(r.weather,'charge')}/>
    <div className="section-heading"><h2>{name} 주변 지역 충전소</h2></div>
    <div className="chips big">{nearby(r).map(x=><Link key={x.code} href={`/region/${x.code}`}>{label(x)}</Link>)}</div>
    {sido&&<><div className="section-heading"><h2>{sido.name} 다른 지역</h2></div><div className="chips">{sido.regions.filter(x=>x.code!==r.code).map(x=><Link key={x.code} href={`/region/${x.code}`}>{x.name}</Link>)}</div></>}
  </section>;
}
