import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {academyPath,feeRange,latest,n,openedByMonth,SITE,subjectLabel,updated,ymd} from '../../lib/data';
export const metadata:Metadata={title:'새로 문 연 학원 · 최근 개원한 학원·교습소',description:'최근 교육청에 개설 신고한 학원·교습소를 개설일 순으로. 지역·과목·공개 수강료를 함께 보여 드립니다.',alternates:{canonical:'/new'}};
const ym=(m:string)=>`${m.slice(0,4)}년 ${Number(m.slice(4,6))}월`;
export default function NewAcademies(){
  const groups=new Map<string,typeof latest>();
  for(const a of latest){const m=a.established.slice(0,6);groups.set(m,[...(groups.get(m)??[]),a]);}
  const recent=openedByMonth[0];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 새로 문 연 학원</nav>
    <h1>새로 문 연 학원</h1>
    <p className="ac-answer">교육청에 개설 신고한 날짜 순으로 최근 문을 연 학원·교습소 <b>{n(latest.length)}곳</b>을 보여 드려요.{recent?<> {ym(recent.month)}에는 <b>{n(recent.count)}곳</b>이 문을 열었어요.</>:null} <span className="muted">({updated()} 기준, 매일 갱신)</span></p>
    {openedByMonth.length>0&&<section><h2>월별 개원 수</h2><ol className="ac-months">{openedByMonth.map(m=><li key={m.month}><span>{ym(m.month)}</span><b>{n(m.count)}곳</b></li>)}</ol></section>}
    <AdSlot/>
    {[...groups].map(([m,list])=><section key={m}><h2>{ym(m)} 개원</h2><div className="ac-cards">{list.map(a=><a key={a.id} className="ac-card" href={academyPath(a.id)}>
      <span className="ac-card-body"><b>{a.name}</b><small>{[a.region_name,...a.subjects.slice(0,3).map(subjectLabel)].join(' · ')}</small><small className="muted">개설 {ymd(a.established)} · {a.address}</small></span>
      <span className={feeRange(a)?'ac-fee':'ac-fee none'}>{feeRange(a)??'수강료 미공개'}</span></a>)}</div></section>)}
    <Faq items={[
      ['최근 새로 문 연 학원은 어디인가요?',latest.length?`가장 최근에는 ${latest.slice(0,3).map(a=>`${a.region_name} ${a.name}(${ymd(a.established)})`).join(', ')} 등이 개설 신고했습니다.`:''],
      ['한 달에 학원은 몇 곳이나 새로 생기나요?',openedByMonth.length?`최근 12개월 동안 월 ${n(Math.min(...openedByMonth.map(m=>m.count)))}~${n(Math.max(...openedByMonth.map(m=>m.count)))}곳이 새로 문을 열었습니다(현재 개원 중인 곳 기준).`:''],
      ['개설일은 어떤 기준인가요?','학원이 관할 교육지원청에 등록(개설 신고)한 날짜로, 나이스 교육정보 개방 포털 학원교습소정보 기준입니다.'],
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 학원',SITE+'/'],['새로 문 연 학원',SITE+'/new']])}/>
  </div>;
}
