import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {NearNow} from '../_components/NearNow';
import {closeHm,n,nation,regions,sidos,SITE,updated,zoneOf} from '../../lib/data';

// 밤·주말 소아과(11/14 — 독감철 '야간 소아과'·'일요일 소아과' 검색). 주소는 해마다 그대로, 숫자는 매일 빌드 때 summary.json에서.
const kids=regions.filter(r=>r.depts.pediatrics).map(r=>({r,d:r.depts.pediatrics!}));
const sum=(k:'night'|'sun'|'hol')=>kids.reduce((a,x)=>a+x.d[k],0);
const N={all:nation.pediatrics??0,night:sum('night'),sun:sum('sun'),hol:sum('hol')};
export const metadata:Metadata={title:`밤·주말 소아과 — 야간 ${n(N.night)}곳·일요일 ${n(N.sun)}곳 지금 진료 중인 곳`,
  description:`전국 소아청소년과 ${n(N.all)}곳 중 평일 저녁 8시 넘어서까지 진료 ${n(N.night)}곳, 일요일 ${n(N.sun)}곳, 공휴일 ${n(N.hol)}곳. 내 주변 지금 진료 중인 소아과와 시군구별 야간·일요일 소아과.`,
  alternates:{canonical:'/kids'}};
export default function Kids(){
  const bySido=sidos.map(s=>{const xs=kids.filter(x=>s.regions.includes(x.r));return {name:s.name,all:xs.reduce((a,x)=>a+x.d.count,0),night:xs.reduce((a,x)=>a+x.d.night,0),sun:xs.reduce((a,x)=>a+x.d.sun,0)};}).filter(s=>s.all);
  const top=[...kids].sort((a,b)=>b.d.night+b.d.sun-(a.d.night+a.d.sun)).slice(0,20);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 밤·주말 소아과</nav>
    <h1>🧒 밤·주말 소아과</h1>
    <p className="hp-answer">전국 소아과(소아청소년과) <b>{n(N.all)}곳</b> 중 평일 저녁 8시 넘어서까지 진료 <b>{n(N.night)}곳</b>, 일요일 <b>{n(N.sun)}곳</b>, 공휴일 {n(N.hol)}곳. <span className="muted">({updated()} 기준)</span></p>
    <NearNow initialDept="pediatrics"/>
    <p className="muted small">숨쉬기 힘들어하거나 의식이 흐리는 등 위급하면 바로 119에 전화하거나 <Link href="/er">가까운 응급실</Link>로 가세요. 진료 시간은 병원이 신고한 정보라 다를 수 있어 가기 전에 전화로 확인하세요.</p>
    <section><h2>야간·일요일 소아과 많은 시군구</h2><ol className="hp-rank">{top.map(({r,d})=><li key={r.id}><Link href={`/region/${r.id}/pediatrics`}><b>{r.name}</b><span>야간 {n(d.night)} · 일요일 {n(d.sun)}</span></Link></li>)}</ol></section>
    <section><h2>시도별 소아과</h2><table className="hp-table"><thead><tr><th>시도</th><th>소아과</th><th>야간</th><th>일요일</th></tr></thead>
      <tbody>{bySido.map(s=><tr key={s.name}><td><Link href={`/region#${s.name}`}>{s.name}</Link></td><td>{n(s.all)}</td><td>{n(s.night)}</td><td>{n(s.sun)}</td></tr>)}</tbody></table></section>
    <Faq items={[
      ['밤에 진료하는 소아과는 몇 곳인가요?',`${updated()} 기준 평일 저녁 8시 넘어서까지 진료 시간을 등록한 소아청소년과는 전국 ${n(N.night)}곳입니다.`],
      ['일요일에 여는 소아과는?',`일요일 진료 시간을 등록한 소아청소년과는 전국 ${n(N.sun)}곳입니다. 가장 많은 곳은 ${[...kids].sort((a,b)=>b.d.sun-a.d.sun).slice(0,3).map(x=>`${x.r.name} ${n(x.d.sun)}곳`).join(', ')}입니다.`],
      ['우리 동네에서 가장 늦게까지 하는 소아과는?',(()=>{const l=[...kids].filter(x=>x.d.late).sort((a,b)=>b.d.late!.close-a.d.late!.close)[0];return l?`시군구 페이지마다 평일 가장 늦게까지 진료하는 곳을 보여 드려요. 예: ${zoneOf(l.r)} ${l.d.late!.name} ${closeHm(l.d.late!.close)}까지.`:'시군구 페이지에서 평일 저녁 8시 넘어서까지 진료하는 소아과를 확인하세요.';})()],
    ]}/>
    <Connect items={genericFor('hospital')}/>
    <JsonLd data={breadcrumbLd([['내근처 병원',SITE+'/'],['밤·주말 소아과',SITE+'/kids']])}/>
  </div>;
}
