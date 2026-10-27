import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {StationList} from '../../_components/StationList';
import {brandName,diff,eun,fresh,md,mapUrl,nation,nearby,PROD_LABEL,rankIn,regionOf,SITE,slim,station,stations,updated,won,type Prod} from '../../../lib/data';
import {Actions} from '@guidejung/ui/favlist';

export const dynamicParams=false;
export function generateStaticParams(){return stations.map(s=>({id:s.id}));}
type P={params:Promise<{id:string}>};
const prods=(s:ReturnType<typeof station>)=>(Object.keys(PROD_LABEL) as Prod[]).filter(p=>s.prices[p]);
export async function generateMetadata({params}:P):Promise<Metadata>{
  const s=station((await params).id);if(!s)return {};const r=regionOf(s);
  return {title:`${s.name} 기름값 ${prods(s).map(p=>`${PROD_LABEL[p]} ${won(s.prices[p])}`).join(' · ')}`,
    description:`${fresh(s)?updated():md(s.seen)} ${s.name}${s.brand?`(${brandName(s.brand)}${s.self?'·셀프':''})`:''} ${prods(s).map(p=>`${PROD_LABEL[p]} ${won(s.prices[p])}`).join(', ')}. ${r?`${r.label} 평균 휘발유 ${won(r.avg.B027?.price)}. `:''}주소 ${s.address??''}, 길찾기·근처 싼 주유소.`,alternates:{canonical:`/station/${s.id}`}};
}
export default async function StationPage({params}:P){
  const s=station((await params).id);if(!s)notFound();
  const r=regionOf(s),rank=rankIn(s),ra=r?.avg.B027?.price??null,na=nation.B027?.price??null,g=s.prices.B027??null;
  const near=nearby(s,6);
  return <div className="page" id="station-detail">
    <nav className="crumbs"><Link href="/">홈</Link> › {r?<><Link href="/region">지역별 휘발유</Link> › <Link href={`/region/${r.code}`}>{r.label}</Link> › </>:null}{s.name}</nav>
    <div className="oi-head"><h1>{s.name}</h1><p>{s.self&&<span className="oi-tag self">셀프</span>}{s.brand&&<span className="oi-tag">{brandName(s.brand)}</span>}{s.address}</p></div>
    <Actions fav={{id:s.id,name:s.name,sub:s.address??'',url:`/station/${s.id}`}}/>
    <div className="oi-avg">{prods(s).map(p=><div key={p}><span>{PROD_LABEL[p]}</span><b>{won(s.prices[p])}</b>
      {p==='B027'&&ra&&g?<small className={g>ra?'up':'down'}>{r?.name} 평균 {diff(g-ra)}</small>:p==='D047'&&nation.D047?.price&&s.prices.D047?<small className={s.prices.D047>nation.D047.price?'up':'down'}>전국 평균 {diff(s.prices.D047-nation.D047.price)}</small>:null}</div>)}
      {rank&&<div><span>{r?.name} 휘발유 최저가 순위</span><b>{rank}위</b><small>{r?.items.length}곳 중</small></div>}</div>
    <div className="oi-actions"><a href={mapUrl(s)} target="_blank" rel="noopener">🧭 길찾기</a>{r&&<Link className="sub" href={`/region/${r.code}`}>{r.label} 최저가 목록</Link>}</div>
    <p className="muted small">{fresh(s)?<>가격은 {updated()}에 오피넷에서 받은 값입니다.</>:<>오늘 최저가 목록에는 없어 <b>{md(s.seen)}에 확인한 가격</b>입니다.</>} 주유 전 현장 가격을 확인하세요.</p>
    <AdSlot/>
    {near.length>0&&<section><h2>근처 다른 싼 주유소</h2><StationList items={near.map(slim)} avg={na} avgLabel="전국 평균" rank={false}/></section>}
    <Faq items={[
      [`${s.name} 휘발유 가격은?`,g?`${fresh(s)?updated():md(s.seen)} 기준 리터당 ${won(g)}입니다${na?`(전국 평균 ${won(na)}보다 ${g>na?`${won(g-na)} 비쌈`:`${won(na-g)} 쌈`})`:''}.`:'휘발유 가격 자료가 없습니다.'],
      [`${eun(s.name)} 셀프 주유소인가요?`,s.self?'이름에 셀프가 들어간 셀프 주유소입니다.':'이름으로는 셀프 주유소인지 알 수 없습니다. 방문 전 확인하세요.'],
      [`${s.name} 위치는?`,s.address?`${s.address}에 있습니다.`:'주소 정보가 없습니다.'],
    ]}/>
    {s.lat!=null&&<Connect items={linksNear(s.lat,s.lon!,'oil')}/>}
    <JsonLd data={{'@context':'https://schema.org','@type':'GasStation',name:s.name,url:`${SITE}/station/${s.id}`,...(s.brand?{brand:{'@type':'Brand',name:brandName(s.brand)}}:{}),
      ...(s.address?{address:{'@type':'PostalAddress',streetAddress:s.address,addressCountry:'KR',...(r?{addressRegion:r.sido_name,addressLocality:r.name}:{})}}:{}),
      ...(s.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:s.lat,longitude:s.lon}}:{}),image:`${SITE}/og.png?v=2`}}/>
    <JsonLd data={breadcrumbLd([['내근처 주유소',SITE+'/'],...(r?[['지역별 휘발유',SITE+'/region'],[r.label,`${SITE}/region/${r.code}`]] as [string,string][]:[]),[s.name,`${SITE}/station/${s.id}`]])}/>
  </div>;
}
