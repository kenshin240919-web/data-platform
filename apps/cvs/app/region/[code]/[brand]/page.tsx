import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {StoreList} from '../../../_components/StoreList';
import {Ad} from '../../../_components/Ad';
import {BRAND_ORDER,BRANDS,COND_MIN,eun,n,ordered,region,regions,SITE,slim,storePath,updated,type BrandKey} from '../../../../lib/data';

// 시군구 × 브랜드 페이지: COND_MIN곳 이상인 곳만 만듦('기타'는 만들지 않음).
export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>BRAND_ORDER.filter(k=>k!=='other'&&r.brands[k]>=COND_MIN).map(k=>({code:r.id,brand:k})));}
type P={params:Promise<{code:string;brand:string}>};
const get=async(params:P['params'])=>{const {code,brand}=await params;const r=region(code);const k=brand as BrandKey;return r&&BRANDS[k]&&k!=='other'?{r,k,items:ordered(r.items.filter(p=>p.brand===k))}:null;};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const x=await get(params);if(!x)return {};
  return {title:`${x.r.name} 상비약 파는 ${BRANDS[x.k].title} ${n(x.items.length)}곳`,description:`${x.r.name}에서 안전상비의약품 판매자로 등록된 ${BRANDS[x.k].title} ${n(x.items.length)}곳: ${x.items.slice(0,5).map(p=>p.name).join(', ')}${x.items.length>5?' 등':''}. 위치·전화·가장 가까운 약국.`,alternates:{canonical:`/region/${x.r.id}/${x.k}`}};
}
export default async function BrandRegion({params}:P){
  const x=await get(params);if(!x||x.items.length<COND_MIN)notFound();
  const {r,k,items}=x;
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {BRANDS[k].label}</nav>
    <h1>{r.name} 상비약 파는 {BRANDS[k].title}</h1>
    <p className="cv-answer"><b>{r.name}</b>에서 안전상비의약품 판매자로 등록된 {eun(BRANDS[k].title)} <b>{n(items.length)}곳</b>이에요. <span className="muted">({updated()} 기준)</span></p>
    <div className="cv-jump">{BRAND_ORDER.filter(o=>o!==k&&o!=='other'&&r.brands[o]>=COND_MIN).map(o=><Link key={o} href={`/region/${r.id}/${o}`}>{r.zone} {BRANDS[o].label} <small>{n(r.brands[o])}</small></Link>)}<Link href={`/region/${r.id}`}>{r.zone} 전체 <small>{n(r.count)}</small></Link></div>
    <section><h2>{r.name} {BRANDS[k].label} 목록</h2><StoreList items={items.map(slim)} brand={k}/>
      <noscript><ul>{items.slice(0,300).map(p=><li key={p.id}><a href={storePath(p.id)}>{p.name}</a></li>)}</ul></noscript></section>
    <Ad/>
    <Faq items={[[`${r.name} 상비약 파는 ${eun(BRANDS[k].title)} 몇 곳인가요?`,`${updated()} 기준 안전상비의약품 판매자로 등록된 ${eun(BRANDS[k].title)} ${n(items.length)}곳입니다(상호 기준).`]]}/>
    <JsonLd data={breadcrumbLd([['내근처 편의점',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[BRANDS[k].label,`${SITE}/region/${r.id}/${k}`]])}/>
  </div>;
}
