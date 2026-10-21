import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {StationList} from '../_components/StationList';
import {cheapest,diesel,nation,SITE,sidos,slim,updated,won} from '../../lib/data';
export const metadata:Metadata={title:'경유 최저가 주유소 · 시도별 경유 싼 곳',description:'오늘 전국·시도별 경유 가장 싼 주유소와 평균 경유 가격. 화물차·디젤 차량 주유 전에 확인하세요.',alternates:{canonical:'/diesel'}};
export default function Diesel(){
  const top=cheapest('D047',10),d=nation.D047?.price??null;
  const list=sidos.filter(s=>diesel(s.code).length).sort((a,b)=>(a.D047?.price??9e9)-(b.D047?.price??9e9));
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 경유 최저가</nav>
    <h1>경유 최저가 주유소</h1>
    <p className="oi-answer">오늘 전국 평균 경유 <b>{won(d)}</b>. 가장 싼 곳은 {top[0]&&<a href={`/station/${top[0].id}`}><b>{top[0].name} {won(top[0].prices.D047)}</b></a>}. <span className="muted">({updated()} 기준)</span></p>
    <section><h2>전국 경유 싼 곳 TOP 10</h2><StationList items={top.map(slim)} prod="D047" avg={d} avgLabel="전국 평균"/></section>
    <section><h2>시도별 경유 최저가</h2><table className="oi-table"><thead><tr><th>시도</th><th className="num">평균 경유</th><th>가장 싼 곳</th></tr></thead>
      <tbody>{list.map(s=>{const f=diesel(s.code)[0];return <tr key={s.code}><td><Link href={`/diesel/${s.code}`}>{s.name}</Link></td><td className="num">{won(s.D047?.price)}</td><td><Link href={`/station/${f.id}`}>{f.name} {won(f.prices.D047)}</Link></td></tr>;})}</tbody></table></section>
    <Faq items={[['오늘 전국 평균 경유 가격은?',`${updated()} 기준 리터당 ${won(d)}입니다.`],['경유가 가장 싼 시도는?',list.length?`${list.slice(0,3).map(s=>`${s.name} ${won(s.D047?.price)}`).join(', ')} 순입니다.`:'자료가 없습니다.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 주유소',SITE+'/'],['경유 최저가',SITE+'/diesel']])}/>
  </div>;
}
