import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearMarket} from '../../_components/NearMarket';
import {Ad} from '../../_components/Ad';
import {baseLabel,CAT_ORDER,CATS,markets,n,nation,pct,regions,SITE,sidos,status,stores,type Cat} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return CAT_ORDER.map(cat=>({cat}));}
type P={params:Promise<{cat:string}>};
const cat=async(p:P['params'])=>{const {cat}=await p;return cat in CATS?cat as Cat:null;};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const c=await cat(params);if(!c)return {};
  return {title:`온누리상품권 ${CATS[c].label} 사용처 ${n(nation.cats[c])}곳 — ${CATS[c].q}`,description:`온누리상품권 되는 ${CATS[c].q} 가맹점 전국 ${n(nation.cats[c])}곳. 내 주변부터, 시도·시군구·시장별로 찾아보세요. ${baseLabel(status.base)} 공식 가맹점 목록 기준.`,alternates:{canonical:`/item/${c}`}};
}
export default async function ItemPage({params}:P){
  const c=await cat(params);if(!c)notFound();
  const total=nation.cats[c];
  const d=stores.filter(s=>s[3]===c&&s[5]).length;
  const topR=[...regions].filter(r=>r.cats[c]).sort((a,b)=>b.cats[c]-a.cats[c]).slice(0,10);
  const topM=[...markets].filter(m=>m.cats[c]).sort((a,b)=>(b.cats[c]??0)-(a.cats[c]??0)).slice(0,10);
  const items=Object.entries(stores.filter(s=>s[3]===c&&s[4]).reduce((a,s)=>(a[s[4]!]=(a[s[4]!]??0)+1,a),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]).slice(0,12);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/item">품목별</Link> › {CATS[c].label}</nav>
    <h1>{CATS[c].icon} 온누리상품권 {CATS[c].label} 사용처</h1>
    <p className="mk-lead">온누리상품권 되는 {CATS[c].label} 가맹점은 전국 {n(total)}곳이에요({baseLabel(status.base)} 기준). 이 중 {n(d)}곳({pct(d,total)}%)은 디지털(모바일·카드)도 받아요.{items.length?` 가게가 직접 적은 품목은 ${items.slice(0,6).map(([k,v])=>`${k} ${n(v)}곳`).join(', ')} 순으로 많아요.`:''}</p>
    <NearMarket cat={c}/>
    <Ad/>
    <section><h2>{CATS[c].label} 가맹점이 많은 시군구</h2><ol className="mk-rank">{topR.map(r=><li key={r.id}><Link href={`/region/${r.id}${r.cats[c]>=10?`/${c}`:''}`}><b>{r.name}</b><span>{n(r.cats[c])}곳</span></Link></li>)}</ol></section>
    <section><h2>{CATS[c].label} 가맹점이 많은 시장·상점가</h2><ol className="mk-rank">{topM.map(m=><li key={m.id}><Link href={`/market/${m.id}`}><b>{m.name}</b><span>{n(m.cats[c]!)}곳</span></Link></li>)}</ol></section>
    <section><h2>시도별</h2><div className="mk-regions">{sidos.filter(s=>s.cats[c]).map(s=><Link key={s.slug} href={`/sido/${s.slug}`}>{s.full}<span>{n(s.cats[c])}곳</span></Link>)}</div></section>
    <Faq items={[
      [`온누리상품권으로 ${CATS[c].label}에서 결제할 수 있나요?`,`네. 전통시장·상점가에 있는 ${CATS[c].label} 중 온누리상품권 가맹점 ${n(total)}곳에서 쓸 수 있어요. 가맹점이 아닌 가게도 있으니 가게의 가맹점 표시를 확인하세요.`],
      [`온누리상품권 ${CATS[c].label}이 가장 많은 곳은?`,`시군구는 ${topR.slice(0,3).map(r=>`${r.name} ${n(r.cats[c])}곳`).join(', ')}, 시장은 ${topM.slice(0,3).map(m=>`${m.name} ${n(m.cats[c]!)}곳`).join(', ')}이에요.`],
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/'],['품목별',SITE+'/item'],[CATS[c].label,`${SITE}/item/${c}`]])}/>
  </div>;
}
