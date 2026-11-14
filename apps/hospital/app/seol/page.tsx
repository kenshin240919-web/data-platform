import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {cond,n,regions,sidos,SITE,updated} from '../../lib/data';

// 설 연휴 문 여는 병원(11/14 — 주소 /seol은 해마다 그대로, 날짜·안내만 바꿈).
// 지금은 평소 '공휴일 진료 시간'을 등록한 병원 기준. 1월에 국립중앙의료원 명절 비상진료기관(HolidyEmgncClnicInsttInfoInqireService)이 나오면 그 명단으로 바꿀 것.
const SEOL={year:2027,days:'2월 6일(토)~9일(화)',from:'2027-02-06'};
export const metadata:Metadata={title:`${SEOL.year} 설 연휴 문 여는 병원 — ${SEOL.days} 지역별 진료하는 병원`,
  description:`${SEOL.year}년 설 연휴(${SEOL.days})에 문 여는 병원 찾기. 공휴일 진료 시간을 등록한 병·의원 전국 ${n(cond.hol)}곳을 시군구별로, 연휴 직전 발표되는 명절 비상진료기관 명단은 나오는 대로 반영합니다.`,
  alternates:{canonical:'/seol'}};
export default function Seol(){
  const top=[...regions].filter(r=>r.cond.hol).sort((a,b)=>b.cond.hol-a.cond.hol);
  const bySido=sidos.map(s=>({name:s.name,hol:s.regions.reduce((a,r)=>a+r.cond.hol,0),kids:s.regions.reduce((a,r)=>a+(r.depts.pediatrics?.hol??0),0)})).filter(s=>s.hol);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › {SEOL.year} 설 연휴 문 여는 병원</nav>
    <h1>🧧 {SEOL.year} 설 연휴 문 여는 병원</h1>
    <p className="hp-answer">설 연휴는 <b>{SEOL.days}</b>이에요. 평소 공휴일 진료 시간을 등록한 병·의원은 전국 <b>{n(cond.hol)}곳</b>이고, 연휴에 문을 여는 <b>명절 비상진료기관</b> 명단은 보통 연휴 직전에 발표돼 나오는 대로 이 페이지에 반영해요. <span className="muted">({updated()} 기준)</span></p>
    <div className="hp-jump"><Link href="/search?cond=holiday">🎌 내 주변 공휴일 진료 병원</Link><Link href="/er">🚑 응급실 남은 병상</Link><Link href="/kids">🧒 밤·주말 소아과</Link><a href="https://pharmacy.guidejung.com/">💊 문 연 약국</a></div>
    <section><h2>공휴일 진료 병원 많은 시군구</h2><ol className="hp-rank">{top.slice(0,20).map(r=><li key={r.id}><Link href={`/region/${r.id}/holiday`}><b>{r.name}</b><span>{n(r.cond.hol)}곳</span></Link></li>)}</ol></section>
    <section><h2>시도별 공휴일 진료 병원</h2><table className="hp-table"><thead><tr><th>시도</th><th>공휴일 진료</th><th>그중 소아과</th></tr></thead>
      <tbody>{bySido.map(s=><tr key={s.name}><td><Link href={`/region#${s.name}`}>{s.name}</Link></td><td>{n(s.hol)}</td><td>{n(s.kids)}</td></tr>)}</tbody></table></section>
    <p className="muted small">명절 비상진료기관은 연휴 기간 날짜마다 문 여는 곳이 달라요. 가기 전에 꼭 전화로 확인하고, 위급하면 119에 전화하세요.</p>
    <Faq items={[
      [`${SEOL.year} 설 연휴는 언제인가요?`,`${SEOL.days}입니다.`],
      ['설 연휴에 문 여는 병원은 어떻게 찾나요?',`연휴 직전 국립중앙의료원·보건복지부가 명절 비상진료기관 명단을 발표합니다. 그 전에는 공휴일 진료 시간을 등록한 병원(전국 ${n(cond.hol)}곳)을 시군구별로 확인할 수 있어요. 가장 많은 곳은 ${top.slice(0,3).map(r=>`${r.name} ${n(r.cond.hol)}곳`).join(', ')}입니다.`],
      ['연휴에 아이가 아프면?','공휴일에 진료하는 소아과를 먼저 찾고, 위급하면 119나 가까운 응급실을 이용하세요.'],
    ]}/>
    <Connect items={genericFor('hospital')}/>
    <JsonLd data={breadcrumbLd([['내근처 병원',SITE+'/'],[`${SEOL.year} 설 연휴 문 여는 병원`,SITE+'/seol']])}/>
  </div>;
}
