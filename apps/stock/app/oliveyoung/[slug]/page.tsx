import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {OliveFinder} from '../../_components/OliveFinder';
import {Ad} from '../../_components/Ad';
import {AREAS} from '../../../lib/areas';
import {OY_ITEMS,oyItem} from '../../../lib/olive';
import {SITE} from '../../../lib/fmt';

export const dynamicParams=false;
export function generateStaticParams(){return OY_ITEMS.map(i=>({slug:i.slug}));}
type P={params:Promise<{slug:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const i=oyItem((await params).slug);if(!i)return {};
  return {title:`올리브영 ${i.name} 재고 · 내 주변 매장 있는 곳`,description:`올리브영 ${i.name}, 내 주변 어느 매장에 있는지 가까운 순으로 확인하세요. ${i.lead.slice(0,70)}…`,alternates:{canonical:`/oliveyoung/${i.slug}`}};
}
export default async function ItemPage({params}:P){
  const i=oyItem((await params).slug);if(!i)notFound();
  const same=OY_ITEMS.filter(x=>x.group===i.group&&x.slug!==i.slug);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/oliveyoung">올리브영</Link> › {i.name}</nav>
    <h1>{i.emoji} 올리브영 {i.name} 재고, 내 주변 어디에?</h1>
    <p className="sk-lead">{i.lead}</p>
    <OliveFinder q={i.q} label={i.name} areas={AREAS}/>
    <Ad/>
    <section className="sk-guide"><h2>{i.name} 고르기 전에</h2><ul>{i.tips.map(t=><li key={t}>{t}</li>)}</ul></section>
    {same.length>0&&<section><h2>같이 찾는 {i.group} 상품</h2><div className="sk-jump">{same.map(x=><Link key={x.slug} href={`/oliveyoung/${x.slug}`}>{x.emoji} {x.name}</Link>)}</div></section>}
    <Faq items={[...i.faq,
      ['재고는 얼마나 정확한가요?','올리브영 앱에 공개된 매장별 재고를 10분마다 새로 받아 보여 드리는 비공식 안내입니다. 실제 매장과 다를 수 있습니다.'],
      ['왜 상품이 3개만 나오나요?',`‘${i.q}’로 찾은 상품 가운데 위쪽 3개의 주변 매장 재고를 확인해 보여 드립니다. 찾는 상품이 없으면 첫 화면 올리브영 탭에서 상품 이름으로 직접 검색하세요.`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 재고',SITE+'/'],['올리브영',SITE+'/oliveyoung'],[i.name,`${SITE}/oliveyoung/${i.slug}`]])}/>
  </div>;
}
