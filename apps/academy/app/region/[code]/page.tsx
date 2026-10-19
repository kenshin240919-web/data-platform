import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd,ga} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {LiveList} from '../../_components/LiveList';
import {GRADES,MAIN_SUBJECTS,man,MIN_SUBJECT,n,region,regions,SITE,SUBJECTS,SUBJECT_ICON,updated} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
const subjectsOf=(r:NonNullable<ReturnType<typeof region>>)=>Object.entries(r.subjects).sort((a,b)=>b[1].count-a[1].count);
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  const top=subjectsOf(r).slice(0,3).map(([k,s])=>`${SUBJECTS[k]} ${n(s.count)}곳`).join('·');
  return {title:`${r.name} 학원 ${n(r.count)}곳 · 과목별 수강료`,description:`${r.name} 학원·교습소 ${n(r.count)}곳(${top}). 교육청에 공개된 과목별 수강료와 학원 목록을 확인하세요.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const subs=subjectsOf(r);const withFee=subs.filter(([,s])=>s.fees);
  // 3초 답: 학부모가 가장 많이 찾는 수학·영어·국어 순으로 수강료가 공개된 과목.
  const lead=MAIN_SUBJECTS.map(k=>withFee.find(([x])=>x===k)).find(Boolean)??withFee[0];
  const grades=Object.entries(r.grades).sort((a,b)=>b[1]-a[1]);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 학원</Link> › {r.name}</nav>
    <h1>{r.name} 학원</h1>
    <p className="ac-answer"><b>{r.name}</b>에는 학원·교습소 <b>{n(r.count)}곳</b>이 있고{lead?<>, {SUBJECTS[lead[0]]} 공개 수강료 중앙값은 <b>{man(lead[1].fees!.median)}</b>이에요</>:'요'}. <span className="muted">({updated()} 기준)</span></p>
    <div className="ac-subjects">{subs.filter(([,s])=>s.count>=MIN_SUBJECT).map(([k,s])=><Link key={k} href={`/region/${r.id}/${k}`}><span aria-hidden="true">{SUBJECT_ICON[k]}</span>{SUBJECTS[k]} <small>{n(s.count)}</small></Link>)}</div>
    {withFee.length>0&&<section><h2>{r.name} 과목별 공개 수강료</h2>
      <table className="ac-table"><thead><tr><th>과목</th><th>학원 수</th><th>중앙값</th><th>최저~최고</th></tr></thead>
        <tbody>{withFee.map(([k,s])=><tr key={k}><th><Link href={`/region/${r.id}/${k}`}>{SUBJECT_ICON[k]} {SUBJECTS[k]}</Link></th><td>{n(s.count)}곳</td><td><b>{man(s.fees!.median)}</b></td><td>{man(s.fees!.min)}~{man(s.fees!.max)}</td></tr>)}</tbody></table>
      <p className="muted small">공개된 과정별 수강료 기준(기간 표기 없음). 실제 수강료는 학원에 확인하세요.</p></section>}
    <AdSlot/>
    <LiveList title={`${r.name} 학원 목록`} initial={r.top} query={{region:r.id}}/>
    {r.new.length>0&&<section><h2>최근 문을 연 학원</h2><ul className="ac-links">{r.new.map(c=><li key={c.id}><a href={`/academy/${c.id}`}>{c.name}</a>{c.established&&<span className="muted"> · {c.established.slice(0,4)}.{c.established.slice(4,6)} 개설</span>}</li>)}</ul></section>}
    <Faq items={[
      [`${r.name}에 학원은 몇 곳인가요?`,`${updated()} 기준 ${r.name}에는 학원 ${n(r.academies)}곳과 교습소 ${n(r.count-r.academies)}곳, 모두 ${n(r.count)}곳이 개원 중입니다.`],
      [`${r.name}에서 가장 많은 학원은 어떤 과목인가요?`,subs.length?`${subs.slice(0,3).map(([k,s])=>`${SUBJECTS[k]} ${n(s.count)}곳`).join(', ')} 순입니다.`:''],
      ...withFee.slice(0,3).map(([k,s]):[string,string]=>[`${r.name} ${SUBJECTS[k]} 학원 수강료는 얼마인가요?`,`교육청에 공개된 ${r.name} ${SUBJECTS[k]} 과정 수강료 ${n(s.fees!.n)}건의 중앙값은 ${man(s.fees!.median)}, 범위는 ${man(s.fees!.min)}~${man(s.fees!.max)}입니다.`]),
      [`${r.name} 학원은 주로 어느 학년 대상인가요?`,grades.length?`과정 이름 기준으로 ${grades.slice(0,3).map(([g,c])=>`${GRADES[g]} ${n(c)}곳`).join(', ')} 순입니다.`:''],
      ['수강료가 모든 학원에 나오나요?',`아니요. ${r.name} ${n(r.count)}곳 중 ${ga(n(r.with_fees)+'곳')} 금액을 공개했습니다. 공개하지 않은 곳은 '수강료 미공개'로 표시합니다.`],
    ]}/>
    {r.lat!=null&&<Connect items={linksNear(r.lat,r.lon!,'academy')}/>}
    <JsonLd data={breadcrumbLd([['내근처 학원',SITE+'/'],['지역별 학원',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
