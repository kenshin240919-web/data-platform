import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {StationList} from '../../_components/StationList';
import {diff,eun,nation,region,regions,SITE,slim,tank,updated,won} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.code}));}
type P={params:Promise<{code:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};const f=r.items[0];
  return {title:`${r.label} 주유소 휘발유 최저가 ${won(f?.prices.B027)} · 싼 주유소 ${r.items.length}곳`,
    description:`${updated()} ${r.label} 휘발유 가장 싼 주유소는 ${f?.name} ${won(f?.prices.B027)}. 평균 ${won(r.avg.B027?.price)}, 경유 평균 ${won(r.avg.D047?.price)}. 싼 순 ${r.items.length}곳의 가격·주소·길찾기.`,alternates:{canonical:`/region/${r.code}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const f=r.items[0],a=r.avg.B027?.price??null,na=nation.B027?.price??null;
  const gap=a&&f?.prices.B027?a-f.prices.B027:0;
  const others=regions.filter(x=>x.sido===r.sido&&x.code!==r.code&&x.avg.B027?.price).sort((x,y)=>x.avg.B027!.price!-y.avg.B027!.price!);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 휘발유</Link> › <Link href={`/region#${r.sido}`}>{r.sido_name}</Link> › {r.name}</nav>
    <h1>{r.label} 휘발유 최저가 주유소</h1>
    <p className="oi-answer">오늘 <b>{r.label}</b>에서 휘발유가 가장 싼 곳은 <a href={`/station/${f.id}`}><b>{f.name} {won(f.prices.B027)}</b></a>{gap>0&&<> — 지역 평균보다 리터당 {won(gap)} 싸요(60L 가득 {won(tank(gap))} 절약)</>}. <span className="muted">({updated()} 기준)</span></p>
    <div className="oi-avg"><div><span>{r.name} 평균 휘발유</span><b>{won(a)}</b>{a&&na&&<small className={a>na?'up':'down'}>전국 평균 {diff(a-na)}</small>}</div>
      <div><span>{r.name} 평균 경유</span><b>{won(r.avg.D047?.price)}</b></div><div><span>최저가 휘발유</span><b>{won(f.prices.B027)}</b></div></div>
    <section><h2>{r.label} 휘발유 싼 순 {r.items.length}곳</h2><StationList items={r.items.map(slim)} avg={a}/></section>
    <AdSlot/>
    {others.length>0&&<section><h2>{r.sido_name} 다른 지역 평균 휘발유</h2><div className="oi-sidos">{others.map(x=><Link key={x.code} href={`/region/${x.code}`}><b>{x.name}</b><span>{won(x.avg.B027!.price)}</span></Link>)}</div></section>}
    <Faq items={[
      [`${r.label}에서 휘발유가 가장 싼 주유소는?`,`${updated()} 기준 ${f.name}(${f.address??''})이 리터당 ${won(f.prices.B027)}으로 가장 쌉니다.${r.items[1]?` 다음은 ${r.items.slice(1,3).map(s=>`${s.name} ${won(s.prices.B027)}`).join(', ')}입니다.`:''}`],
      [`${r.label} 평균 휘발유 가격은?`,a?`${eun(r.label)} 평균 휘발유 ${won(a)}${na?`로 전국 평균(${won(na)})보다 ${a>na?`${won(a-na)} 비쌉니다`:`${won(na-a)} 쌉니다`}`:'입니다'}.`:'평균 가격 자료가 없습니다.'],
      [`${r.label} 셀프 주유소는?`,(()=>{const s=r.items.filter(x=>x.self);return s.length?`최저가 목록 ${r.items.length}곳 중 셀프 주유소는 ${s.length}곳입니다(예: ${s.slice(0,3).map(x=>x.name).join(', ')}).`:'최저가 목록에 셀프 주유소가 없습니다.';})()],
    ]}/>
    {r.lat!=null&&<Connect items={linksNear(r.lat,r.lon!,'oil')}/>}
    <JsonLd data={breadcrumbLd([['내근처 주유소',SITE+'/'],['지역별 휘발유',SITE+'/region'],[r.label,`${SITE}/region/${r.code}`]])}/>
  </div>;
}
