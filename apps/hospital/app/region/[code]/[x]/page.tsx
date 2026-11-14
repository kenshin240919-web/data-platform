import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {LiveList} from '../../../_components/LiveList';
import {closeHm,CONDITIONS,COND_KEY,deptCounts,deptSearch,DEPTS,hospitalPath,MIN_DEPT,n,region,regions,SITE,updated,zoneOf,type Card,type Late} from '../../../../lib/data';

// 시군구 × 과목(소아청소년과 등, 3곳 이상) 또는 × 조건(야간·일요일·공휴일, 1곳 이상) 페이지.
export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>[
  ...Object.entries(r.depts).filter(([,d])=>d.count>=MIN_DEPT).map(([k])=>({code:r.id,x:k})),
  ...Object.entries(COND_KEY).filter(([,k])=>r.cond[k]).map(([slug])=>({code:r.id,x:slug}))]);}
type P={params:Promise<{code:string;x:string}>};
type View={title:string;h1:string;desc:string;answer:React.ReactNode;count:number;top:Card[];query:{region:string;dept?:string;cond?:string};faq:[string,string][];filter?:'night'|'sunday'|'holiday'};
// 11/14: 네이버에서 찾는 말('강남 소아과'·'일요일 진료 병원'·'야간 진료 병원')로 제목을, 3초 답에는 그 지역 실제 숫자(야간·일요일 수, 가장 늦게까지 하는 곳)를.
const lateLink=(l:Late|undefined)=>l?<> 가장 늦게까지는 <a href={hospitalPath(l.id)}><b>{l.name}</b></a> <b>{closeHm(l.close)}</b>까지예요.</>:null;
const lateText=(l:Late|undefined)=>l?` 가장 늦게까지는 ${l.name} ${closeHm(l.close)}.`:'';
async function view(params:P['params']):Promise<(View&{r:NonNullable<ReturnType<typeof region>>;x:string})|null>{
  const {code,x}=await params;const r=region(code);if(!r)return null;const z=zoneOf(r);
  if(DEPTS[x]&&r.depts[x]){const d=r.depts[x];const label=DEPTS[x],name=deptSearch(x),also=name!==label?`(${label})`:'';
    const nightLine=d.night?`평일 저녁 8시 넘어서까지 진료 ${n(d.night)}곳`:'평일 저녁 8시 넘어서까지 진료하는 곳은 없고';
    return {r,x,title:`${r.name} ${name}`,h1:`${r.name} ${name}${also}`,count:d.count,top:d.top,query:{region:r.id,dept:x},
      desc:`${z} ${name} ${n(d.count)}곳 중 ${nightLine}, 일요일 ${n(d.sun)}곳·공휴일 ${n(d.hol)}곳.${lateText(d.late)} 지금 진료 중인 곳과 요일별 진료 시간.`,
      answer:<>{z} {name} <b>{n(d.count)}곳</b> 중 {d.night?<>평일 저녁 8시 넘어서까지 진료 <b>{n(d.night)}곳</b></>:'평일 저녁 8시 넘어서까지 진료하는 곳은 없고'}, 일요일 <b>{n(d.sun)}곳</b>·공휴일 {n(d.hol)}곳.{lateLink(d.late)}</>,
      faq:[[`${z} ${name}는 몇 곳인가요?`,`${updated()} 기준 ${label}를 진료과목으로 신고한 곳은 ${n(d.count)}곳입니다.`],
        [`${z}에서 일요일에 진료하는 ${name}는?`,d.sun?`일요일 진료 시간이 등록된 곳은 ${n(d.sun)}곳입니다. 아래 목록에서 '일요일' 칩을 누르면 그곳만 보여요.`:'일요일 진료 시간이 등록된 곳이 없습니다. 가까운 응급실이나 다른 지역을 확인하세요.'],
        [`${z} ${name} 야간 진료하는 곳은?`,d.night?`평일 저녁 8시 이후까지 진료하는 곳은 ${n(d.night)}곳입니다.${lateText(d.late)}`:`평일 저녁 8시 이후까지 진료하는 ${name}는 없습니다.${lateText(d.late)}`]]};}
  const k=COND_KEY[x];if(k&&r.cond[k]){const c=CONDITIONS[x as keyof typeof CONDITIONS];const by=deptCounts(r,k);
    const late=k==='night'?r.late:undefined;
    const what=k==='night'?'평일 저녁 8시 넘어서까지 진료하는':k==='sun'?'일요일에 문 여는':'공휴일에 문 여는';
    return {r,x,title:`${r.name} ${c.title}`,h1:`${r.name} ${c.title}`,count:r.cond[k],top:r.cond_top[k],query:{region:r.id,cond:x},filter:x as View['filter'],
      desc:`${z}에서 ${what} 병원 ${n(r.cond[k])}곳(전체 ${n(r.count)}곳 중)${by?`: ${by}곳`:''}.${lateText(late)} 과목별로 지금 진료 중인 곳을 확인하세요.`,
      answer:<>{z}에서 {what} 병원은 전체 {n(r.count)}곳 중 <b>{n(r.cond[k])}곳</b>{by&&<> · {by}곳</>}.{lateLink(late)}</>,
      faq:[[`${z} ${c.title}은 몇 곳인가요?`,`${updated()} 기준 ${z}에서 ${c.desc} 병원은 ${n(r.cond[k])}곳입니다${by?`(과목별 ${by}곳)`:''}.`]]};}
  return null;
}
export async function generateMetadata({params}:P):Promise<Metadata>{const v=await view(params);if(!v)return {};
  return {title:v.filter?`${v.title} ${n(v.count)}곳`:`${v.title} ${n(v.count)}곳 · 야간·일요일 진료 시간`,description:v.desc,alternates:{canonical:`/region/${v.r.id}/${v.x}`}};}
export default async function Page({params}:P){
  const v=await view(params);if(!v)notFound();const {r}=v;
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 병원</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {v.title.replace(r.name+' ','')}</nav>
    <h1>{v.h1}</h1>
    <p className="hp-answer">{v.answer} <span className="muted">({updated()} 기준)</span></p>
    <div className="hp-jump">{Object.entries(COND_KEY).filter(([s,k])=>s!==v.x&&r.cond[k]).map(([s,k])=><Link key={s} href={`/region/${r.id}/${s}`}>{zoneOf(r)} {CONDITIONS[s as keyof typeof CONDITIONS].title} <small>{n(r.cond[k])}</small></Link>)}<Link href={`/region/${r.id}`}>{zoneOf(r)} 병원 전체 <small>{n(r.count)}</small></Link></div>
    <LiveList title={`${v.title} 목록`} query={v.query} initial={v.top} deptChips={!v.query.dept} filter={v.filter} ad={3}/>
    <noscript><ul>{v.top.map(c=><li key={c.id}><a href={`/hospital/${c.id}`}>{c.name}</a> · {c.address}</li>)}</ul></noscript>
    <Faq items={v.faq}/>
    <JsonLd data={breadcrumbLd([['내근처 병원',SITE+'/'],['지역별 병원',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[v.title,`${SITE}/region/${r.id}/${v.x}`]])}/>
  </div>;
}
