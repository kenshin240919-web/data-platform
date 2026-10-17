import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {CHARGE,SITE,TRIP,WEATHER,fetched,findRest,fmtDate,rests,restsOn,roadName,won} from '../../../lib/data';
import {Connect,linksNear} from '@guidejung/ui/network';
import {Faq,JsonLd,breadcrumbLd,eun,type QA} from '@guidejung/ui/seo';

export const dynamicParams=false;
export function generateStaticParams(){return rests.map(r=>({code:r.code}));}
type Props={params:Promise<{code:string}>};
const avg=(k:'gasoline'|'diesel')=>{const v=rests.map(r=>won(r.gas?.[k])).filter((n):n is number=>!!n);return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):null;};
export async function generateMetadata(props:Props):Promise<Metadata>{
  const {code}=await props.params;const r=findRest(code);if(!r)return {};
  const f=r.foods.find(x=>x.best)??r.foods[0];
  return {title:`${r.name} 대표 음식·기름값·편의시설`,description:`${roadName({name:r.route})} ${r.name}${r.dir?`(${r.dir} 방향)`:''}${f?` 대표 음식 ${f.name}`:''}${won(r.gas?.gasoline)?`, 휘발유 ${r.gas!.gasoline}`:''}. 편의시설, 주변 충전소·날씨·가볼만한곳까지 확인하세요.`,
    alternates:{canonical:`${SITE}/rest/${code}`},openGraph:{images:'/og.png',title:r.name,url:`${SITE}/rest/${code}`}};
}
export default async function RestPage(props:Props){
  const {code}=await props.params;const r=findRest(code);if(!r)notFound();
  const road=roadName({name:r.route});const g=won(r.gas?.gasoline),d=won(r.gas?.diesel),ag=avg('gasoline'),ad=avg('diesel');
  const diff=(v:number|null,a:number|null)=>v&&a?(v<a?<span className="tf-cheap">평균보다 {a-v}원 싸요</span>:v>a?<span className="muted small">평균보다 {v-a}원 비싸요</span>:null):null;
  const same=restsOn(r.routeNo).filter(x=>x.code!==code);const best=r.foods.find(x=>x.best)??r.foods[0];
  return <section className="section">
    <nav className="breadcrumbs" aria-label="현재 위치"><Link href="/">내근처 고속도로</Link><span>/</span><Link href="/rest">휴게소</Link><span>/</span><Link href={`/road/${r.routeNo}`}>{road}</Link><span>/</span><span>{r.name}</span></nav>
    <h1>{r.name}</h1>
    <p className="muted small">{road}{r.dir?` · ${r.dir} 방향`:''} · {r.area}</p>
    <section className="tf-hero rest"><p className="tf-answer">{best?<>대표 음식 <b>{best.name}</b></>:<>{r.name}</>}</p>
      <p className="tf-sub">{[best&&Number(best.cost)?`${Number(best.cost).toLocaleString()}원`:'',g?`휘발유 ${g.toLocaleString()}원`:'',r.facilities.length?`편의시설 ${r.facilities.length}가지`:''].filter(Boolean).join(' · ')}</p></section>
    <div className="tf-cross"><a href={`https://map.kakao.com/link/to/${encodeURIComponent(r.name)},${r.lat},${r.lng}`} target="_blank" rel="noopener noreferrer">🧭 길찾기</a>
      <Link href={`/road/${r.routeNo}`}>🛣️ {road} 교통상황</Link><a href={`${CHARGE}/region/${r.charge}`}>⚡ 주변 충전소</a><a href={`${WEATHER}/region/${r.weather}`}>🌤️ {r.area} 날씨</a><a href={`${TRIP}/search?lat=${r.lat}&lon=${r.lng}&radius_km=10`}>🚗 근처 가볼만한곳</a></div>
    {r.foods.length>0&&<><div className="section-heading"><h2>음식 메뉴</h2></div>
      <ul className="tf-foods">{r.foods.map(f=><li key={f.name}><div><b>{f.name}</b>{f.best&&<span className="tag fast">추천</span>}{f.desc&&<p>{f.desc}</p>}</div><span>{Number(f.cost)?`${Number(f.cost).toLocaleString()}원`:''}</span></li>)}</ul></>}
    <AdSlot/>
    {r.gas&&<><div className="section-heading"><h2>주유소 가격</h2><Link href="/gas">휴게소 기름값 순위</Link></div>
      <dl className="tf-gas"><div><dt>휘발유</dt><dd><b>{r.gas.gasoline||'-'}</b>{diff(g,ag)}</dd></div><div><dt>경유</dt><dd><b>{r.gas.diesel||'-'}</b>{diff(d,ad)}</dd></div>{r.gas.lpg&&<div><dt>LPG</dt><dd><b>{r.gas.lpg}</b></dd></div>}</dl>
      <p className="muted small">한국도로공사 제공 · {fmtDate(fetched)} 기준 · 실제 가격은 현장에서 확인하세요.</p></>}
    {(r.facilities.length>0||r.brands)&&<><div className="section-heading"><h2>편의시설</h2></div>
      <div className="chips">{r.facilities.map(x=><span key={x} className="chip-static">{x}</span>)}{r.brands&&<span className="chip-static">☕ {r.brands}</span>}</div></>}
    <Connect title={`${r.name}에서 함께 보기`} items={linksNear(r.lat,r.lng,'traffic')}/>
    <Faq title={`${r.name} 자주 묻는 질문`} items={([
      [`${eun(r.name)} 어디에 있나요?`,`${road}${r.dir?` ${r.dir} 방향`:''}에 있는 휴게소로, ${r.area}에 있습니다.`],
      best?[`${r.name} 대표 음식은 무엇인가요?`,`대표 음식은 ${best.name}${Number(best.cost)?`(${Number(best.cost).toLocaleString()}원)`:''}입니다.${r.foods.length>1?` 이 밖에 ${r.foods.filter(f=>f!==best).slice(0,4).map(f=>f.name).join(', ')} 등이 있습니다.`:''}`]:null,
      g?[`${r.name} 기름값은 얼마인가요?`,`${fmtDate(fetched)} 기준 휘발유 ${r.gas!.gasoline}${d?`, 경유 ${r.gas!.diesel}`:''}입니다.${ag?` 전국 휴게소 휘발유 평균(${ag.toLocaleString()}원)보다 ${g<ag?`${ag-g}원 쌉니다`:g>ag?`${g-ag}원 비쌉니다`:'같습니다'}.`:''}`]:null,
      r.facilities.length?[`${r.name}에는 어떤 편의시설이 있나요?`,`${r.facilities.join(', ')}${r.brands?`, 매장(${r.brands})`:''}이 있습니다.`]:null,
    ] as (QA|null)[]).filter((x):x is QA=>!!x)}/>
    <JsonLd data={breadcrumbLd([['내근처 고속도로',SITE+'/'],['휴게소',SITE+'/rest'],[road,`${SITE}/road/${r.routeNo}`],[r.name,`${SITE}/rest/${code}`]])}/>
    {same.length>0&&<><div className="section-heading"><h2>{road} 다른 휴게소</h2></div><div className="chips big">{same.map(x=><Link key={x.code} href={`/rest/${x.code}`}>{x.name}</Link>)}</div></>}
  </section>;
}
