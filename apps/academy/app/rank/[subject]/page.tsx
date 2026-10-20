import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd,ga} from '@guidejung/ui/seo';
import {man,n,nation,SITE,SUBJECTS,SUBJECT_ICON,updated} from '../../../lib/data';
import {MIN_FEES,RANK_SUBJECTS,rankOf,type RankRow} from '../../../lib/rank';

export const dynamicParams=false;
export function generateStaticParams(){return RANK_SUBJECTS.map(subject=>({subject}));}
type P={params:Promise<{subject:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const {subject}=await params;const l=SUBJECTS[subject];const list=rankOf(subject);if(!l||!list.length)return {};
  return {title:`${l} 학원비 순위 · 비싼 동네 ${list[0].name} ${man(list[0].median)}`,description:`${l} 학원 수강료가 비싼 동네와 싼 동네 시군구 순위. 1위 ${list[0].name} ${man(list[0].median)}, 전국 중앙값 ${man(nation[subject].fees!.median)}(교육청 공개 수강료 기준).`,alternates:{canonical:`/rank/${subject}`}};
}
function Table({rows,start=1,subject}:{rows:RankRow[];start?:number;subject:string}){
  return <table className="ac-table"><thead><tr><th>순위</th><th>지역</th><th>중앙값</th><th>최저~최고</th><th>학원 수</th></tr></thead>
    <tbody>{rows.map((r,i)=><tr key={r.id}><td>{start+i}</td><th><Link href={`/region/${r.id}/${subject}`}>{r.name}</Link></th><td><b>{man(r.median)}</b></td><td>{man(r.min)}~{man(r.max)}</td><td>{n(r.count)}곳</td></tr>)}</tbody></table>;
}
export default async function SubjectRank({params}:P){
  const {subject}=await params;const label=SUBJECTS[subject];const list=rankOf(subject);if(!label||list.length<5)notFound();
  const f=nation[subject].fees!;const top=list.slice(0,20);const cheap=[...list].reverse().slice(0,20);
  const most=[...list].sort((a,b)=>b.count-a.count).slice(0,10);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/rank">학원비 순위</Link> › {label}</nav>
    <h1>{SUBJECT_ICON[subject]} {label} 학원비 순위</h1>
    <p className="ac-answer"><b>{label}</b> 학원비가 가장 비싼 동네는 <b>{list[0].name}</b>(중앙값 {man(list[0].median)}), 가장 싼 동네는 <b>{list[list.length-1].name}</b>({man(list[list.length-1].median)})이에요. 전국 중앙값은 <b>{man(f.median)}</b>. <span className="muted">({updated()} 기준)</span></p>
    <div className="ac-subjects">{RANK_SUBJECTS.filter(k=>k!==subject).map(k=><Link key={k} href={`/rank/${k}`}><span aria-hidden="true">{SUBJECT_ICON[k]}</span>{SUBJECTS[k]}</Link>)}</div>
    <section><h2>💸 {label} 학원비 비싼 동네 TOP {top.length}</h2><Table rows={top} subject={subject}/></section>
    <AdSlot/>
    <section><h2>💰 {label} 학원비 싼 동네 TOP {cheap.length}</h2><Table rows={cheap} subject={subject}/></section>
    <section><h2>🏫 {label} 학원 많은 동네 TOP {most.length}</h2><ol className="ac-rank">{most.map(r=><li key={r.id}><Link href={`/region/${r.id}/${subject}`}><b>{r.name}</b><span>{n(r.count)}곳</span></Link></li>)}</ol></section>
    <p className="muted small">교육청에 공개된 {label} 과정 수강료 중 지역마다 {MIN_FEES}건 이상 있는 {n(list.length)}개 시군구 비교. 금액은 기간(월·주) 표기가 없는 경우가 많아 실제와 다를 수 있으니 학원에 확인하세요.</p>
    <Faq items={[
      [`${label} 학원비가 가장 비싼 지역은?`,`교육청 공개 수강료 중앙값 기준 ${list[0].name} ${man(list[0].median)}, ${list[1].name} ${man(list[1].median)}, ${list[2].name} ${man(list[2].median)} 순입니다.`],
      [`${label} 학원비가 가장 싼 지역은?`,`${ga(list[list.length-1].name)} ${man(list[list.length-1].median)}으로 가장 낮습니다.`],
      [`${label} 학원비는 전국 평균 얼마인가요?`,`공개된 ${label} 과정 수강료 ${n(f.n)}건의 중앙값은 ${man(f.median)}이고, 범위는 ${man(f.min)}~${man(f.max)}입니다.`],
      [`${label} 학원이 가장 많은 지역은?`,`${most[0].name} ${n(most[0].count)}곳, ${most[1].name} ${n(most[1].count)}곳 순입니다.`],
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 학원',SITE+'/'],['학원비 순위',SITE+'/rank'],[label,`${SITE}/rank/${subject}`]])}/>
  </div>;
}
