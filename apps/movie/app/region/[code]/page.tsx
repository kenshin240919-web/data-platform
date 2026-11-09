import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {TheaterList} from '../../_components/TheaterList';
import {Ad} from '../../_components/Ad';
import {CHAIN_ORDER,CHAINS,n,ordered,region,regions,SITE,slim,theaterPath,updated} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
const parts=(r:NonNullable<ReturnType<typeof region>>)=>CHAIN_ORDER.filter(k=>r.chains[k]).map(k=>`${CHAINS[k].label} ${n(r.chains[k])}`);
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  return {title:`${r.name} 영화관 ${n(r.count)}곳 · 오늘 상영 시간표`,description:`${r.name} 영화관 ${n(r.count)}곳(${parts(r).join(', ')}), 상영관 ${n(r.screens)}개. 극장마다 오늘 남은 상영 시간과 좌석, 주소·주차장을 확인하세요.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const list=ordered(r.items);
  const big=[...r.items].sort((a,b)=>b.screens-a.screens).slice(0,3);
  const sp=[...new Set(r.items.flatMap(t=>t.special??[]))];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › {r.name}</nav>
    <h1>{r.name} 영화관</h1>
    <p className="mv-answer"><b>{r.name}</b> 영화관 <b>{n(r.count)}곳</b>(상영관 {n(r.screens)}개): {parts(r).join(' · ')}. <span className="muted">({updated()} 기준)</span></p>
    <section><h2>{r.name} 극장 목록</h2><TheaterList items={list.map(slim)}/>
      <noscript><ul>{list.map(p=><li key={p.id}><a href={theaterPath(p.id)}>{p.name}</a> · {CHAINS[p.chain].label}</li>)}</ul></noscript></section>
    <Ad/>
    <p className="mv-jump"><Link href="/boxoffice">🏆 어제 박스오피스 보기 →</Link></p>
    <Faq items={([
      [`${r.name}에 영화관은 몇 곳인가요?`,`${updated()} 기준 지자체에 등록된 영화관은 ${n(r.count)}곳, 상영관은 ${n(r.screens)}개입니다(${parts(r).join(', ')}).`],
      [`${r.name}에서 상영관이 많은 극장은?`,big.map(t=>`${t.name}(${t.screens}개)`).join(', ')+'입니다.'],
      [`${r.name}에 IMAX·4DX 같은 특별관이 있나요?`,sp.length?`상영관 이름 기준 ${sp.join(', ')} 특별관이 있습니다.`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect items={linksNear(r.lat,r.lon,'movie')}/>
    <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
