import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {RouteLive} from '../../_components/RouteLive';
import {Connect,nearArea,linksNear,type Link_} from '@guidejung/ui/network';
import {SITE,WEATHER,findRoute,roadName,routes,restsOn,won} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return routes.map(r=>({no:r.no}));}
type Props={params:Promise<{no:string}>};
export async function generateMetadata(props:Props):Promise<Metadata>{
  const {no}=await props.params;const r=findRoute(no);if(!r)return {};const name=roadName(r);
  return {title:`${name} 실시간 교통상황 - 정체 구간·휴게소`,description:`${name}(${r.start}~${r.end}) 실시간 정체·서행 구간을 IC 순서대로 확인하세요. 구간별 속도, 휴게소 ${restsOn(no).length}곳의 대표 음식과 기름값도 함께 안내합니다.`,
    alternates:{canonical:`${SITE}/road/${no}`},openGraph:{title:`${name} 실시간 교통상황`,url:`${SITE}/road/${no}`}};
}
/** 출발·중간·도착 지역 날씨 + 노선 중간쯤 가볼만한곳·충전소. */
function alongRoad(r:NonNullable<ReturnType<typeof findRoute>>):Link_[]{
  const p=r.pts;if(!p?.length)return [];
  const at=(i:number)=>nearArea(p[i][0],p[i][1]);const ends=[at(0),at(Math.floor(p.length/2)),at(p.length-1)];
  const seen=new Set<string>();const out:Link_[]=[];
  for(const [a,tag] of [[ends[0],'출발'],[ends[1],'중간'],[ends[2],'도착']] as const){if(seen.has(a.weather))continue;seen.add(a.weather);
    out.push({icon:'🌤️',title:`${a.label} 날씨`,desc:`${tag} 지역 · 비·눈·특보 확인`,href:`https://weather.guidejung.com/region/${a.weather}`});}
  const mid=p[Math.floor(p.length/2)];
  return [...out,...linksNear(mid[0],mid[1],'traffic').filter(l=>l.icon!=='🌤️')];
}

export default async function RoutePage(props:Props){
  const {no}=await props.params;const r=findRoute(no);if(!r)notFound();
  const name=roadName(r);const rs=restsOn(no);const others=routes.filter(x=>x.no!==no).slice(0,16);
  return <section className="section">
    <nav className="breadcrumbs" aria-label="현재 위치"><Link href="/">교통정보</Link><span>/</span><Link href="/road">고속도로</Link><span>/</span><span>{name}</span></nav>
    <h1>{name} 실시간 교통상황</h1>
    <p className="muted small">{r.start} ↔ {r.end} · 구간 {r.E.length+r.S.length}개 · 휴게소 {rs.length}곳</p>
    <RouteLive route={r}/>
    {rs.length>0&&<><div className="section-heading"><h2>{name} 휴게소</h2><Link href="/gas">기름값 순위</Link></div>
      <div className="tf-cards">{rs.map(x=>{const f=x.foods.find(y=>y.best)??x.foods[0];return <Link key={x.code} href={`/rest/${x.code}`} className="tf-card">
        <span className="tf-card-title">{x.dir?`${x.dir} 방향`:x.area}</span><strong>{x.name}</strong><small>{[f?.name,won(x.gas?.gasoline)?`휘발유 ${x.gas!.gasoline}`:''].filter(Boolean).join(' · ')||x.area}</small></Link>;})}</div></>}
    <AdSlot/>
    <Connect title={`${name} 따라 함께 보기`} items={alongRoad(r)}/>
    <div className="section-heading"><h2>다른 고속도로</h2></div>
    <div className="chips big">{others.map(x=><Link key={x.no} href={`/road/${x.no}`}>{roadName(x)}</Link>)}</div>
  </section>;
}
