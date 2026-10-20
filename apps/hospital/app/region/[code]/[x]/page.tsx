import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {LiveList} from '../../../_components/LiveList';
import {CONDITIONS,COND_KEY,DEPTS,MIN_DEPT,n,region,regions,SITE,updated,zoneOf,type Card} from '../../../../lib/data';

// 시군구 × 과목(소아청소년과 등, 3곳 이상) 또는 × 조건(야간·일요일·공휴일, 1곳 이상) 페이지.
export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>[
  ...Object.entries(r.depts).filter(([,d])=>d.count>=MIN_DEPT).map(([k])=>({code:r.id,x:k})),
  ...Object.entries(COND_KEY).filter(([,k])=>r.cond[k]).map(([slug])=>({code:r.id,x:slug}))]);}
type P={params:Promise<{code:string;x:string}>};
type View={title:string;desc:string;count:number;top:Card[];query:{region:string;dept?:string;cond?:string};faq:[string,string][];filter?:'night'|'sunday'|'holiday'};
async function view(params:P['params']):Promise<(View&{r:NonNullable<ReturnType<typeof region>>;x:string})|null>{
  const {code,x}=await params;const r=region(code);if(!r)return null;
  if(DEPTS[x]&&r.depts[x]){const d=r.depts[x];const label=DEPTS[x];
    return {r,x,title:`${r.name} ${label}`,count:d.count,top:d.top,query:{region:r.id,dept:x},
      desc:`${r.name} ${label} ${n(d.count)}곳: 야간 진료 ${n(d.night)}곳, 일요일 ${n(d.sun)}곳, 공휴일 ${n(d.hol)}곳. ${d.top.slice(0,3).map(c=>c.name).join(', ')} 등 지금 진료 중인 곳과 진료 시간.`,
      faq:[[`${r.name} ${label}는 몇 곳인가요?`,`${updated()} 기준 ${label}를 진료과목으로 신고한 곳은 ${n(d.count)}곳입니다.`],
        [`${r.name}에서 일요일에 진료하는 ${label}는?`,d.sun?`일요일 진료 시간이 등록된 곳은 ${n(d.sun)}곳입니다.`:'일요일 진료 시간이 등록된 곳이 없습니다.'],
        [`${r.name}에서 야간에 진료하는 ${label}는?`,`평일 저녁 8시 이후까지 진료하는 곳은 ${n(d.night)}곳입니다.`]]};}
  const k=COND_KEY[x];if(k&&r.cond[k]){const c=CONDITIONS[x as keyof typeof CONDITIONS];
    return {r,x,title:`${r.name} ${c.title}`,count:r.cond[k],top:r.cond_top[k],query:{region:r.id,cond:x},filter:x as View['filter'],
      desc:`${r.name}에서 ${c.desc} 병원 ${n(r.cond[k])}곳: ${r.cond_top[k].slice(0,4).map(h=>h.name).join(', ')} 등. 과목별로 지금 진료 중인 곳을 확인하세요.`,
      faq:[[`${r.name} ${c.title}은 몇 곳인가요?`,`${updated()} 기준 ${r.name}에서 ${c.desc} 병원은 ${n(r.cond[k])}곳입니다.`]]};}
  return null;
}
export async function generateMetadata({params}:P):Promise<Metadata>{const v=await view(params);if(!v)return {};
  return {title:`${v.title} ${n(v.count)}곳`,description:v.desc,alternates:{canonical:`/region/${v.r.id}/${v.x}`}};}
export default async function Page({params}:P){
  const v=await view(params);if(!v)notFound();const {r}=v;
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 병원</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {v.title.replace(r.name+' ','')}</nav>
    <h1>{v.title}</h1>
    <p className="hp-answer">{v.desc} <span className="muted">({updated()} 기준)</span></p>
    <div className="hp-jump">{Object.entries(COND_KEY).filter(([s,k])=>s!==v.x&&r.cond[k]).map(([s,k])=><Link key={s} href={`/region/${r.id}/${s}`}>{zoneOf(r)} {CONDITIONS[s as keyof typeof CONDITIONS].title} <small>{n(r.cond[k])}</small></Link>)}<Link href={`/region/${r.id}`}>{zoneOf(r)} 병원 전체 <small>{n(r.count)}</small></Link></div>
    <LiveList title={`${v.title} 목록`} query={v.query} initial={v.top} deptChips={!v.query.dept} filter={v.filter}/>
    <noscript><ul>{v.top.map(c=><li key={c.id}><a href={`/hospital/${c.id}`}>{c.name}</a> · {c.address}</li>)}</ul></noscript>
    <AdSlot/>
    <Faq items={v.faq}/>
    <JsonLd data={breadcrumbLd([['내근처 병원',SITE+'/'],['지역별 병원',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[v.title,`${SITE}/region/${r.id}/${v.x}`]])}/>
  </div>;
}
