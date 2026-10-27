import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {StoreTable,type Row} from '../../../_components/StoreTable';
import {Ad} from '../../../_components/Ad';
import {baseLabel,CATS,n,pct,region,regionCats,regions,SITE,sidoFull,sidoSlug,status,storesIn,type Cat} from '../../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>regionCats(r).map(c=>({code:r.id,cat:c})));}
type P={params:Promise<{code:string;cat:string}>};
const get=async(p:P['params'])=>{const {code,cat}=await p;const r=region(code);return r&&cat in CATS&&regionCats(r).includes(cat as Cat)?{r,c:cat as Cat}:null;};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const x=await get(params);if(!x)return {};const {r,c}=x;
  return {title:`${r.name} 온누리상품권 ${CATS[c].label} 가맹점 ${n(r.cats[c])}곳`,description:`${r.name}에서 온누리상품권 되는 ${CATS[c].q} ${n(r.cats[c])}곳을 시장·상점가별로. ${baseLabel(status.base)} 공식 가맹점 목록 기준.`,alternates:{canonical:`/region/${r.id}/${c}`}};
}
export default async function RegionCat({params}:P){
  const x=await get(params);if(!x)notFound();const {r,c}=x;
  const list=storesIn(r.markets,c);
  const rows:Row[]=list.map(({s,m})=>({id:s[0],name:s[1],cat:s[3],item:s[4],d:s[5],y:s[6],m:m.name})).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  const byM=r.markets.map(m=>({m,k:m.cats[c]??0})).filter(x=>x.k).sort((a,b)=>b.k-a.k);
  const d=list.filter(x=>x.s[5]).length;
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href={`/sido/${sidoSlug(r.sido)}`}>{sidoFull(r.sido)}</Link> › <Link href={`/region/${r.id}`}>{r.zone}</Link> › {CATS[c].label}</nav>
    <h1>{CATS[c].icon} {r.name} 온누리상품권 {CATS[c].label}</h1>
    <p className="mk-answer">온누리상품권 되는 {CATS[c].label} <b>{n(list.length)}곳</b> · 디지털도 되는 곳 {n(d)}곳({pct(d,list.length)}%)</p>
    <p className="mk-lead">{r.name}의 {CATS[c].label} 온누리 가맹점은 {byM.slice(0,3).map(x=>`${x.m.name} ${n(x.k)}곳`).join(', ')} 순으로 많아요.</p>
    <StoreTable rows={rows} latest={status.latest_year} cat={c}/>
    <Ad/>
    <section><h2>{CATS[c].label} 가맹점이 많은 시장·상점가</h2><ol className="mk-rank">{byM.slice(0,10).map(x=><li key={x.m.id}><Link href={`/market/${x.m.id}`}><b>{x.m.name}</b><span>{n(x.k)}곳</span></Link></li>)}</ol></section>
    <p><Link className="mk-more-link" href={`/region/${r.id}`}>{r.name} 온누리상품권 사용처 전체 →</Link> · <Link className="mk-more-link" href={`/item/${c}`}>전국 {CATS[c].label} →</Link></p>
    <Faq items={[[`${r.name}에서 온누리상품권 되는 ${CATS[c].label}은 몇 곳인가요?`,`${baseLabel(status.base)} 기준 ${n(list.length)}곳이에요. ${byM.slice(0,3).map(x=>`${x.m.name} ${n(x.k)}곳`).join(', ')}.`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/'],[r.name,`${SITE}/region/${r.id}`],[CATS[c].label,`${SITE}/region/${r.id}/${c}`]])}/>
  </div>;
}
