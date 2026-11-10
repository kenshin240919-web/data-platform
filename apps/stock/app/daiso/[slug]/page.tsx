import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {StockFinder} from '../../_components/StockFinder';
import {Ad} from '../../_components/Ad';
import {AREAS} from '../../../lib/areas';
import {ITEMS,item} from '../../../lib/items';
import {SITE} from '../../../lib/fmt';

export const dynamicParams=false;
export function generateStaticParams(){return ITEMS.map(i=>({slug:i.slug}));}
type P={params:Promise<{slug:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const i=item((await params).slug);if(!i)return {};
  return {title:`다이소 ${i.name} 재고 · 내 동네 매장 있는 곳`,description:`다이소 ${i.name}, 내 동네 어느 매장에 있는지 가까운 순으로 확인하세요. ${i.lead.slice(0,70)}…`,alternates:{canonical:`/daiso/${i.slug}`}};
}
export default async function ItemPage({params}:P){
  const i=item((await params).slug);if(!i)notFound();
  const same=ITEMS.filter(x=>x.group===i.group&&x.slug!==i.slug);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/daiso">자주 찾는 물건</Link> › {i.name}</nav>
    <h1>{i.emoji} 다이소 {i.name} 재고, 내 동네 어디에?</h1>
    <p className="sk-lead">{i.lead}</p>
    <StockFinder q={i.q} label={i.name} areas={AREAS}/>
    <Ad/>
    <section className="sk-guide"><h2>{i.name} 고르기 전에</h2><ul>{i.tips.map(t=><li key={t}>{t}</li>)}</ul></section>
    {same.length>0&&<section><h2>같이 찾는 {i.group} 물건</h2><div className="sk-jump">{same.map(x=><Link key={x.slug} href={`/daiso/${x.slug}`}>{x.emoji} {x.name}</Link>)}</div></section>}
    <Faq items={[...i.faq,['재고는 얼마나 정확한가요?','다이소몰에 공개된 매장별 재고를 5분마다 새로 받아 보여 드리는 비공식 안내입니다. 급하면 매장에 전화로 확인하세요.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 재고',SITE+'/'],['자주 찾는 물건',SITE+'/daiso'],[i.name,`${SITE}/daiso/${i.slug}`]])}/>
  </div>;
}
