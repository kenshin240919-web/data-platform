import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksForCode} from '@guidejung/ui/network';
import {ItemList} from '../../../_components/Cards';
import {Ad} from '../../../_components/Ad';
import {byViews,FIELDS,localItems,n,nationItems,region,regionFields,regions,SITE,sidoItems,today,type Field} from '../../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>regionFields(r).map(f=>({code:r.code,field:f})));}
type P={params:Promise<{code:string;field:string}>};
const get=async(p:P['params'])=>{const {code,field}=await p;const r=region(code);return r&&field in FIELDS?{r,f:field as Field}:null;};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const g=await get(params);if(!g)return {};const {r,f}=g;
  const list=[...localItems(r.code),...sidoItems(r.sido)].filter(i=>i.field===f).sort(byViews);
  return {title:`${r.name} ${FIELDS[f].label} 지원금·혜택 ${n(list.length)}가지`,description:`${r.name} ${FIELDS[f].label}(${FIELDS[f].q}) 혜택 ${n(list.length)}가지: ${list.slice(0,3).map(i=>i.name).join('·')} 등. 대상·금액·신청 방법.`.slice(0,160),alternates:{canonical:`/region/${r.code}/${f}`}};
}
export default async function RegionField({params}:P){
  const g=await get(params);if(!g)notFound();const {r,f}=g;
  const local=localItems(r.code).filter(i=>i.field===f).sort(byViews),sido=sidoItems(r.sido).filter(i=>i.field===f).sort(byViews),nation=nationItems.filter(i=>i.field===f).sort(byViews).slice(0,10);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › <Link href={`/region/${r.code}`}>{r.name}</Link> › {FIELDS[f].label}</nav>
    <h1>{FIELDS[f].icon} {r.name} {FIELDS[f].label} 혜택</h1>
    <p className="bf-lead">{r.zone}이 주는 {FIELDS[f].label} 혜택 {n(local.length)}가지와 {r.sido} 전체 혜택 {n(sido.length)}가지예요.</p>
    {local.length>0&&<section><h2>🏘️ {r.zone}</h2><ItemList list={local} today={today} hideScope/></section>}
    {sido.length>0&&<section><h2>🏙️ {r.sido} 전체</h2><ItemList list={sido} today={today}/></section>}
    <Ad/>
    <section><h2>🇰🇷 전국 공통 {FIELDS[f].label}</h2><ItemList list={nation} today={today}/><p><Link className="bf-more-link" href={`/topic/${f}`}>전국 {FIELDS[f].label} 혜택 모두 보기 →</Link></p></section>
    <Faq title={`${r.name} ${FIELDS[f].label} 혜택 자주 묻는 질문`} items={[[`${r.name} ${FIELDS[f].label} 혜택에는 무엇이 있나요?`,[...local,...sido].slice(0,6).map(i=>i.name).join(', ')+' 등이 있어요.']]}/>
    <Connect items={linksForCode(r.code,'benefit')}/>
    <JsonLd data={breadcrumbLd([['내근처 혜택',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.code}`],[FIELDS[f].label,`${SITE}/region/${r.code}/${f}`]])}/>
  </div>;
}
