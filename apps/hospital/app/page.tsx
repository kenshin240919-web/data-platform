import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {NearNow} from './_components/NearNow';
import {cond,DEPTS,DEPT_ICON,erCount,MAIN_DEPTS,n,nation,regions,sidos,SITE,status,updated} from '../lib/data';
import {FavList} from '@guidejung/ui/favlist';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const kids=[...regions].sort((a,b)=>(b.depts.pediatrics?.sun??0)-(a.depts.pediatrics?.sun??0)).slice(0,8);
  return <div className="page hp-home">
    <section className="hp-hero"><h1>지금 진료하는 병원 어디?</h1>
      <p><b>지금 진료 중</b>인 병원을 과목별로 가까운 순으로</p></section>
    <FavList hint="병원 상세에서 ☆ 즐겨찾기를 누르면 여기서 바로 지금 진료 중인지 볼 수 있어요."/>
    <NearNow/>
    {/* 전국 수치(검색엔진·AI 답변용): 첫 화면을 가볍게 하려고 히어로에서 3초 답 아래로 내림(10/29 사용자) */}
    <p className="muted small gj-facts">전국 병·의원 <b>{n(status.count)}곳</b>의 요일별 진료 시간으로 <b>지금 진료 중</b>인 곳을 과목별로 가까운 순으로 보여 드려요. 야간 {n(cond.night)}곳 · 일요일 {n(cond.sun)}곳 · 공휴일 {n(cond.hol)}곳 · 응급실 {n(erCount)}곳.</p>
    <AdSlot/>
    <section><h2>과목별 병원 (전국)</h2><div className="hp-dept-grid">{MAIN_DEPTS.map(k=><Link key={k} href={`/search?dept=${k}`}><span aria-hidden="true">{DEPT_ICON[k]}</span><b>{DEPTS[k]}</b><small>{n(nation[k]??0)}곳</small></Link>)}</div>
      <p className="muted small">병원이 신고한 진료과목 기준이에요(전문의 여부와는 달라요).</p></section>
    <section><h2>일요일 진료 소아청소년과 많은 지역</h2><ol className="hp-rank">{kids.map(r=><li key={r.id}><Link href={`/region/${r.id}/pediatrics`}><b>{r.name}</b><span>{n(r.depts.pediatrics?.sun??0)}곳</span></Link></li>)}</ol></section>
    <section><h2>시도별 병원</h2><div className="hp-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <Faq items={[
      ['지금 진료하는 병원은 어떻게 찾나요?','‘내 위치 주변 지금 진료하는 병원 보기’를 누르고 과목(소아청소년과·내과·이비인후과 등)을 고르면 가까운 순으로 지금 진료 중인 곳과 마감 시간을 보여 드립니다.'],
      ['일요일·공휴일에 진료하는 병원은 몇 곳인가요?',`${updated()} 기준 일요일 진료 시간이 등록된 곳은 ${n(cond.sun)}곳, 공휴일은 ${n(cond.hol)}곳입니다.`],
      ['야간 진료 병원은 몇 곳인가요?',`평일 저녁 8시 이후까지 진료하는 곳은 전국 ${n(cond.night)}곳입니다.`],
      ['응급실 남은 병상도 볼 수 있나요?',`네. 응급실을 운영하는 ${n(erCount)}곳 중 가까운 곳과 국립중앙의료원이 실시간으로 알려 주는 응급실 남은 병상 수를 보여 드립니다. 위급할 때는 바로 119에 전화하세요.`],
    ]}/>
    <Connect items={genericFor('hospital')}/>
    <JsonLd data={breadcrumbLd([['내근처 병원',SITE+'/']])}/>
  </div>;
}
