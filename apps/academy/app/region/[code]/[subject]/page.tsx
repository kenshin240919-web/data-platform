import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {LiveList} from '../../../_components/LiveList';
import {man,MIN_SUBJECT,n,region,regions,SITE,SUBJECTS,SUBJECT_ICON,updated} from '../../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>Object.entries(r.subjects).filter(([,s])=>s.count>=MIN_SUBJECT).map(([k])=>({code:r.id,subject:k})));}
type P={params:Promise<{code:string;subject:string}>};
const get=async(p:P['params'])=>{const {code,subject}=await p;const r=region(code);const s=r?.subjects[subject];return r&&s?{r,s,k:subject,label:SUBJECTS[subject]}:null;};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const x=await get(params);if(!x)return {};const {r,s,label}=x;
  return {title:`${r.name} ${label} 학원 ${n(s.count)}곳${s.fees?` · 수강료 중앙값 ${man(s.fees.median)}`:''}`,
    description:`${r.name} ${label} 학원·교습소 ${n(s.count)}곳${s.fees?`, 교육청 공개 수강료 ${man(s.fees.min)}~${man(s.fees.max)}(중앙값 ${man(s.fees.median)})`:''}. 학원 목록과 과정별 수강료를 비교하세요.`,alternates:{canonical:`/region/${r.id}/${x.k}`}};
}
export default async function SubjectPage({params}:P){
  const x=await get(params);if(!x)notFound();const {r,s,k,label}=x;
  const others=Object.entries(r.subjects).filter(([o,v])=>o!==k&&v.count>=MIN_SUBJECT).sort((a,b)=>b[1].count-a[1].count).slice(0,8);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 학원</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {label}</nav>
    <h1>{r.name} {label} 학원</h1>
    <p className="ac-answer"><b>{r.name}</b>의 {label} 학원·교습소는 <b>{n(s.count)}곳</b>{s.fees?<>이고, 공개 수강료 중앙값은 <b>{man(s.fees.median)}</b>(최저 {man(s.fees.min)} · 최고 {man(s.fees.max)})이에요</>:'이에요'}. <span className="muted">({updated()} 기준)</span></p>
    <AdSlot/>
    <LiveList title={`${r.name} ${label} 학원 목록`} initial={s.top} query={{region:r.id,subject:k}} chips={false}/>
    {others.length>0&&<section><h2>{r.name} 다른 과목 학원</h2><div className="ac-subjects">{others.map(([o,v])=><Link key={o} href={`/region/${r.id}/${o}`}><span aria-hidden="true">{SUBJECT_ICON[o]}</span>{SUBJECTS[o]} <small>{n(v.count)}</small></Link>)}</div></section>}
    <Faq items={[
      [`${r.name} ${label} 학원은 몇 곳인가요?`,`${updated()} 기준 ${r.name}에서 ${label} 과정을 운영하는 학원·교습소는 ${n(s.count)}곳입니다.`],
      [`${r.name} ${label} 학원 수강료는 얼마인가요?`,s.fees?`교육청에 공개된 ${label} 과정 수강료 ${n(s.fees.n)}건 기준 중앙값 ${man(s.fees.median)}, 최저 ${man(s.fees.min)}, 최고 ${man(s.fees.max)}입니다. 기간(월·주) 표기가 없는 금액이 많아 학원에 확인이 필요합니다.`:`${r.name} ${label} 학원 중 수강료 금액을 공개한 곳은 아직 없습니다.`],
    ]}/>
    {r.lat!=null&&<Connect items={linksNear(r.lat,r.lon!,'academy')}/>}
    <JsonLd data={breadcrumbLd([['내근처 학원',SITE+'/'],['지역별 학원',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[label,`${SITE}/region/${r.id}/${k}`]])}/>
  </div>;
}
