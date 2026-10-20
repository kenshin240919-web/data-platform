import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {man,n,nation,SITE,SUBJECTS,SUBJECT_ICON,updated} from '../../lib/data';
import {RANK_SUBJECTS,rankOf} from '../../lib/rank';
export const metadata:Metadata={title:'과목별 학원비 순위 · 지역별 수강료 비싼 곳·싼 곳',description:'수학·영어·국어·피아노·미술 학원비가 비싼 동네와 싼 동네. 교육청 공개 수강료 중앙값으로 시군구 순위를 매겼습니다.',alternates:{canonical:'/rank'}};
export default function Ranks(){
  const rows=RANK_SUBJECTS.map(k=>({k,list:rankOf(k),f:nation[k].fees!}));
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 학원비 순위</nav>
    <h1>과목별 학원비 순위</h1>
    <p className="ac-answer">교육청에 공개된 과정별 수강료로 <b>시군구별 중앙값</b>을 비교했어요. 과목을 고르면 비싼 동네·싼 동네 순위를 볼 수 있어요. <span className="muted">({updated()} 기준)</span></p>
    <div className="ac-rank-cards">{rows.map(({k,list,f})=><Link key={k} href={`/rank/${k}`} className="ac-rank-card">
      <b>{SUBJECT_ICON[k]} {SUBJECTS[k]}</b><span>전국 중앙값 <strong>{man(f.median)}</strong></span>
      <small>가장 비싼 곳 {list[0].name} {man(list[0].median)} · 가장 싼 곳 {list[list.length-1].name} {man(list[list.length-1].median)}</small></Link>)}</div>
    <AdSlot/>
    <Faq items={rows.slice(0,4).map(({k,list,f}):[string,string]=>[`${SUBJECTS[k]} 학원비가 가장 비싼 지역은 어디인가요?`,`교육청 공개 수강료 중앙값 기준 ${list[0].name}(${man(list[0].median)})이 가장 높고, 전국 중앙값은 ${man(f.median)}입니다(공개 금액 ${n(f.n)}건, ${updated()} 기준).`])}/>
    <JsonLd data={breadcrumbLd([['내근처 학원',SITE+'/'],['학원비 순위',SITE+'/rank']])}/>
  </div>;
}
