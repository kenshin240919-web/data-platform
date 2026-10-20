import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd,eun} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {HomeNearby} from './_components/HomeNearby';
import {HomeLocal,type Area} from './_components/HomeLocal';
import weatherRegions from '../../weather/data/regions.json';
const wregions=weatherRegions as {code:string;name:string;lat:number;lon:number}[];
import {latest,man,MAIN_SUBJECTS,n,nation,regions,sidos,SITE,status,SUBJECTS,SUBJECT_ICON,updated} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const popular=[...regions].sort((a,b)=>b.count-a.count).slice(0,12);
  // 위치 → 시군구는 날씨 사이트와 같은 행정 중심점으로(학원이 몰린 곳의 평균점은 옆 시군구에 더 가까울 수 있음).
  // 일반구가 있는 시(수원시 41110)는 그 시의 일반구 중심점들을 모두 후보로 씀.
  const centres=(id:string)=>{const exact=wregions.filter(w=>w.code===id);if(exact.length)return exact;const city=wregions.filter(w=>id.endsWith('0')&&w.code.slice(0,4)===id.slice(0,4)&&w.name.includes(' '));return city;};
  const areas:Area[]=regions.flatMap(r=>{const c=centres(r.id);const pts=c.length?c.map(w=>[w.lat,w.lon] as const):r.lat!=null?[[r.lat,r.lon!] as const]:[];return pts.map(([lat,lon])=>({id:r.id,name:r.name,lat,lon,count:r.count,math:r.subjects.math?.fees?.median,english:r.subjects.english?.fees?.median,korean:r.subjects.korean?.fees?.median}));});
  const feeRows=MAIN_SUBJECTS.filter(k=>nation[k]?.fees);
  const math=nation.math?.fees,eng=nation.english?.fees;
  return <div className="page ac-home">
    <section className="ac-hero">
      <h1>우리 동네 학원비, 얼마야?</h1>
      <p>전국 학원·교습소 <b>{n(status.count)}곳</b>의 위치와 교육청에 공개된 과정별 수강료를 지역·과목·학년별로 보여 드려요. <span className="muted">({updated()} 기준)</span></p>
      <div className="ac-subjects">{MAIN_SUBJECTS.map(k=><Link key={k} href={`/search?subject=${k}`}><span aria-hidden="true">{SUBJECT_ICON[k]}</span>{SUBJECTS[k]}</Link>)}</div>
    </section>
    <HomeLocal areas={areas}/>
    <HomeNearby/>
    <AdSlot/>
    <section><h2>학원 많은 동네 TOP 12</h2><ol className="ac-rank">{popular.map(r=><li key={r.id}><Link href={`/region/${r.id}`}><b>{r.name}</b><span>{n(r.count)}곳</span></Link></li>)}</ol>
      <p><Link href="/region" className="ac-more-link">전체 지역 보기 →</Link></p></section>
    <section><h2>과목별 공개 수강료 (전국)</h2>
      <table className="ac-table"><thead><tr><th>과목</th><th>학원 수</th><th>중앙값</th><th>최저~최고</th></tr></thead>
        <tbody>{feeRows.map(k=>{const f=nation[k].fees!;return <tr key={k}><th><Link href={`/search?subject=${k}`}>{SUBJECT_ICON[k]} {SUBJECTS[k]}</Link></th><td>{n(nation[k].count)}곳</td><td><b>{man(f.median)}</b></td><td>{man(f.min)}~{man(f.max)}</td></tr>;})}</tbody></table>
      <p><Link href="/rank" className="ac-more-link">과목별 학원비 비싼 동네·싼 동네 순위 →</Link></p>
      <p className="muted small">교육청에 공개된 과정별 수강료 {n(feeRows.reduce((a,k)=>a+nation[k].fees!.n,0))}건 기준. 기간(월·주) 표기가 없는 금액이 많아 실제와 다를 수 있어요.</p></section>
    {latest.length>0&&<section><h2>🆕 새로 문 연 학원</h2><ul className="ac-links">{latest.slice(0,6).map(a=><li key={a.id}><a href={`/academy/${a.id}`}>{a.name}</a> <span className="muted">· {a.region_name} · {a.established.slice(0,4)}.{a.established.slice(4,6)}.{a.established.slice(6,8)} 개설</span></li>)}</ul><p><Link href="/new" className="ac-more-link">새로 문 연 학원 모두 보기 →</Link></p></section>}
    <section><h2>시도별 학원</h2><div className="ac-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <Faq items={[
      ['전국에 학원·교습소는 몇 곳인가요?',`나이스 교육정보 개방 포털 기준 ${updated()} 현재 개원 중인 학원·교습소는 ${n(status.count)}곳이고, 그중 ${n(status.with_fees)}곳이 과정별 수강료 금액을 공개하고 있습니다.`],
      ['수학 학원 수강료는 보통 얼마인가요?',math?`교육청에 공개된 수학 과정 수강료 ${n(math.n)}건의 중앙값은 ${man(math.median)}입니다(최저 ${man(math.min)}, 최고 ${man(math.max)}). 학년·횟수에 따라 달라집니다.`:''],
      ['영어 학원 수강료는 보통 얼마인가요?',eng?`공개된 영어 과정 수강료 ${n(eng.n)}건의 중앙값은 ${man(eng.median)}입니다.`:''],
      ['학원이 가장 많은 지역은 어디인가요?',`${eun(popular[0].name)} ${n(popular[0].count)}곳으로 가장 많고, ${popular[1].name}(${n(popular[1].count)}곳), ${popular[2].name}(${n(popular[2].count)}곳) 순입니다.`],
      ['수강료 정보는 어디서 가져오나요?','학원이 교육청에 신고해 나이스(NEIS) 교육정보 개방 포털에 공개된 학원교습소정보를 매일 받아 정리합니다. 실제 수강료는 학원에 꼭 확인하세요.'],
    ]}/>
    <Connect items={genericFor('academy')}/>
    <JsonLd data={breadcrumbLd([['내근처 학원',SITE+'/']])}/>
  </div>;
}
