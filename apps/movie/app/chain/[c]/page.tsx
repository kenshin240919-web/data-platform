import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearMovie} from '../../_components/NearMovie';
import {Ad} from '../../_components/Ad';
import {CHAIN_ORDER,CHAINS,LIVE_CHAINS,n,regions,SITE,theaters,updated,type ChainKey} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return CHAIN_ORDER.map(c=>({c}));}
type P={params:Promise<{c:string}>};
const ok=(c:string):c is ChainKey=>(CHAIN_ORDER as string[]).includes(c);
export async function generateMetadata({params}:P):Promise<Metadata>{
  const c=(await params).c;if(!ok(c))return {};
  const cnt=theaters.filter(t=>t.chain===c).length;
  return {title:`내 주변 ${CHAINS[c].title} ${n(cnt)}곳 · 오늘 상영 시간표`,description:`전국 ${CHAINS[c].title} ${n(cnt)}곳을 내 위치에서 가까운 순으로.${LIVE_CHAINS.includes(c)?' 극장마다 오늘 남은 상영 시간과 남은 좌석을 확인하세요.':' 주소·전화·가까운 주차장을 확인하세요.'}`,alternates:{canonical:`/chain/${c}`}};
}
export default async function ChainPage({params}:P){
  const c=(await params).c;if(!ok(c))notFound();
  const list=theaters.filter(t=>t.chain===c);
  const by=regions.map(r=>({r,k:r.chains[c]})).filter(x=>x.k>0).sort((a,b)=>b.k-a.k);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › {CHAINS[c].title}</nav>
    <h1>내 주변 {CHAINS[c].title}</h1>
    <NearMovie chain={c}/>
    <p className="muted small">전국 {CHAINS[c].title} {n(list.length)}곳 · 상영관 {n(list.reduce((a,t)=>a+t.screens,0))}개 ({updated()} 기준, 지자체 등록 상호로 나눈 비공식 목록)</p>
    <Ad/>
    <section><h2>{CHAINS[c].title} 많은 지역</h2><ol className="mv-rank">{by.slice(0,20).map(({r,k})=><li key={r.id}><Link href={`/region/${r.id}`}><b>{r.name}</b><span>{n(k)}곳</span></Link></li>)}</ol></section>
    <Faq items={[
      [`${CHAINS[c].title}는 전국에 몇 곳인가요?`,`${updated()} 기준 지자체에 등록된 상호로 나누면 ${n(list.length)}곳입니다(본사 공식 목록이 아님).`],
      [`${CHAINS[c].title}가 가장 많은 지역은?`,by.slice(0,3).map(({r,k})=>`${r.name} ${n(k)}곳`).join(', ')+'입니다.'],
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],[CHAINS[c].title,`${SITE}/chain/${c}`]])}/>
  </div>;
}
