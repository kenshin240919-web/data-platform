import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {MySchool} from './_components/MySchool';
import {KIND_ICON,KIND_LABEL,KIND_ORDER,kindCount,n,regions,sidos,SITE,status,updated} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const popular=[...regions].sort((a,b)=>b.count-a.count).slice(0,12);
  return <div className="page sc-home">
    <section className="sc-hero"><h1>오늘 급식 뭐야?</h1>
      <p><b>오늘 급식</b>·D-day·시간표를 열자마자</p></section>
    <MySchool/>
    {/* 전국 수치(검색엔진·AI 답변용): 첫 화면을 가볍게 하려고 히어로에서 3초 답 아래로 내림(10/29 사용자) */}
    <p className="muted small gj-facts">우리 학교를 한 번 고르면 열자마자 <b>오늘 급식</b>, 시험·방학까지 <b>D-day</b>, <b>시간표</b>가 보여요. 전국 {n(status.count)}개 학교, 나이스 공식 데이터.</p>
    <AdSlot/>
    <section><h2>전국 학교</h2><div className="sc-kinds">{KIND_ORDER.filter(k=>kindCount[k]).map(k=><div key={k}><span aria-hidden="true">{KIND_ICON[k]}</span><b>{n(kindCount[k])}</b><small>{KIND_LABEL[k]}</small></div>)}</div>
      <p className="muted small">{updated()} 기준 · 문을 연 학교만(개교 예정 학교 제외)</p></section>
    <section><h2>학교 많은 지역 TOP 12</h2><ol className="sc-rank">{popular.map(r=><li key={r.id}><Link href={`/region/${r.id}`}><b>{r.name}</b><span>{n(r.count)}곳</span></Link></li>)}</ol>
      <p><Link href="/region" className="sc-more-link">전체 지역 보기 →</Link></p></section>
    <section><h2>시도별 학교</h2><div className="sc-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <Faq items={[
      ['우리 학교 오늘 급식은 어떻게 보나요?','학교 이름으로 찾거나 내 주변 학교에서 고른 뒤 ‘내 학교로 저장’을 누르면, 다음부터 이 사이트를 열자마자 오늘 급식이 보입니다.'],
      ['급식 메뉴 옆 숫자는 무엇인가요?','알레르기 유발 식품 번호입니다(1 난류, 2 우유, 5 대두, 6 밀, 10 돼지고기 등). 이 사이트는 번호를 이름으로 풀어 보여 주고, 내 아이 알레르기를 고르면 해당 메뉴를 빨갛게 표시합니다.'],
      ['시험·방학 날짜도 나오나요?','학교가 나이스에 올린 학사일정으로 다음 시험·방학·재량휴업일까지 남은 날(D-day)을 보여 줍니다. 학교가 입력하지 않았거나 바뀐 일정은 다를 수 있습니다.'],
      ['전국에 학교는 몇 곳인가요?',`${updated()} 기준 ${KIND_ORDER.filter(k=>kindCount[k]).map(k=>`${KIND_LABEL[k]} ${n(kindCount[k])}곳`).join(', ')}, 모두 ${n(status.count)}곳입니다.`],
    ]}/>
    <Connect items={genericFor('school')}/>
    <JsonLd data={breadcrumbLd([['내 학교',SITE+'/']])}/>
  </div>;
}
