import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearJob} from '../../_components/NearJob';
import {Ad} from '../../_components/Ad';
import {COND_MIN,LINKS,n,nation,regions,sidos,SITE,updated} from '../../../lib/data';
import {SENIOR,seniorPath,seniorSpan} from '../../../lib/season';

// 2027 노인일자리 신청(11/26 요청서): 모집 기간·대상·신청 방법은 보건복지부 발표로 확인한 것만, 내 주변 수행기관 가까운 순.
const S=SENIOR,Y=S.year;
const title=`${Y} 노인일자리 신청 — ${seniorSpan} 모집, 내 주변 수행기관`;
export const metadata:Metadata={title,description:`${Y}년 노인일자리 및 사회활동 지원사업 ${S.total} 참여자 모집(${seniorSpan}, 지자체마다 다름). 신청 대상·방법과 내 주변 시니어클럽·노인복지관 등 수행기관 ${n(nation.kinds.senior)}곳을 가까운 순으로.`,
  alternates:{canonical:seniorPath}};
const today=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
const left=Math.round((Date.parse(S.end)-Date.parse(today))/864e5);
const state=today<S.start?`${Math.round((Date.parse(S.start)-Date.parse(today))/864e5)}일 뒤 모집 시작`:left>=0?(left?`모집 중 · 마감까지 ${left}일`:'오늘 마감'):'전국 모집 기간이 끝났어요(지자체별 추가 모집은 수행기관에 문의)';
export default function SeniorSeason(){
  const top=[...regions].filter(r=>r.kinds.senior>=COND_MIN).sort((a,b)=>b.kinds.senior-a.kinds.senior).slice(0,12);
  const faq:[string,string][]=[
    [`${Y}년 노인일자리 신청은 언제인가요?`,`보건복지부 발표로는 ${seniorSpan}까지 모집해요. 지자체 여건에 따라 일정이 달라질 수 있어 주소지 시군구 공고를 함께 확인하세요.`],
    ['누가 신청할 수 있나요?',S.types.map(([t,w])=>`${t}은 ${w}`).join(', ')+'이 신청할 수 있어요(보건복지부 발표 기준).'],
    ['어디서 신청하나요?',`주소지 시군구의 행정복지센터나 시니어클럽·노인복지관·대한노인회 같은 수행기관에 가서 신청하거나, ‘노인일자리 여기’에서 온라인으로 신청해요. 상담은 대표전화 ${S.phone}.`],
    ['선발 결과는 언제 알 수 있나요?',`${S.notice}. 선발은 ${S.select}이에요.`],
    ['내 주변 수행기관은 어디인가요?',`이 페이지 위쪽에서 내 위치 가까운 순으로 볼 수 있어요. 전국 ${n(nation.kinds.senior)}곳(${updated()} 기준, 한국노인인력개발원 자료)이에요.`],
  ];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/senior">노인일자리</Link> › {Y} 신청</nav>
    <h1>👴 {Y} 노인일자리 신청 — {seniorSpan}</h1>
    <p className="jb-answer"><b>{state}</b> · {Y}년 노인일자리 <b>{S.total}</b>, 주소지 수행기관이나 행정복지센터에서 신청해요. <span className="muted">(지자체마다 일정이 달라요)</span></p>
    <div className="jb-actions"><a href={LINKS.senior} rel="noopener" target="_blank">🖥️ 노인일자리 여기에서 온라인 신청 ↗</a><a className="sub" href={`tel:${S.phone.replace(/-/g,'')}`}>📞 상담 {S.phone}</a></div>
    <section><h2>📍 내 주변 노인일자리 수행기관</h2><p className="muted small">시니어클럽·노인복지관 등 노인일자리 사업을 하는 곳이에요. 원본 자료에 전화번호가 가려져 있어, 전화는 대표전화나 기관 홈페이지로 확인하세요.</p>
      <NearJob kind="senior"/></section>
    <Ad/>
    <section><h2>📋 {Y} 모집 한눈에</h2>
      <table className="jb-table"><tbody>
        <tr><th>모집 기간</th><td>{seniorSpan} <span className="muted">(지자체 여건에 따라 달라질 수 있음)</span></td></tr>
        <tr><th>규모</th><td>{S.total}</td></tr>
        {S.types.map(([t,w])=><tr key={t}><th>{t}</th><td>{w}</td></tr>)}
        <tr><th>신청하는 곳</th><td>주소지 시군구의 행정복지센터, 시니어클럽·노인복지관·대한노인회 등 수행기관 방문 / 온라인 <a href={LINKS.senior} rel="noopener" target="_blank">노인일자리 여기</a></td></tr>
        <tr><th>상담 전화</th><td>{S.phone} <span className="muted">(건 곳에서 가까운 수행기관으로 연결)</span></td></tr>
        <tr><th>선발</th><td>{S.select}</td></tr>
        <tr><th>결과 통보</th><td>{S.notice}</td></tr>
      </tbody></table>
      <p className="muted small">확인 {S.checked} · 출처: {S.source}. 활동비·유형별 인원은 공고마다 달라 적지 않았어요 — 주소지 공고에서 확인하세요.</p></section>
    <section><h2>✅ 신청 전에 챙길 것</h2><ol>
      <li>내 주소지 시군구 공고의 <b>접수 기간</b>을 먼저 확인해요(전국 기간보다 짧은 곳이 많아요).</li>
      <li>공익활동은 <b>기초연금 수급</b> 여부가 조건이에요. 모르면 행정복지센터에 물어보세요.</li>
      <li>방문 신청은 신분증을 챙기고, 준비 서류는 수행기관 공고를 따르세요. 주민등록등본 같은 서류는 <a href="https://minwon.guidejung.com/doc/resident">무인민원발급기</a>에서 뗄 수 있어요.</li>
    </ol></section>
    {top.length>0&&<section><h2>수행기관 많은 지역</h2><div className="jb-jump">{top.map(r=><Link key={r.id} href={`/region/${r.id}/senior`}>{r.name} <small>{n(r.kinds.senior)}</small></Link>)}</div>
      <details><summary>시도별로 보기</summary><div className="jb-jump">{sidos.map(s=>{const c=s.regions.reduce((a,r)=>a+r.kinds.senior,0);return c?<Link key={s.name} href={`/region#${encodeURIComponent(s.name)}`}>{s.name} <small>{n(c)}</small></Link>:null;})}</div></details></section>}
    <section><h2>함께 보면 좋은 안내</h2><div className="jb-jump"><Link href="/guide#senior">👴 어르신 일자리 찾는 순서</Link><Link href="/senior">전국 노인일자리 기관 {n(nation.kinds.senior)}곳</Link><a href="https://benefit.guidejung.com/topic">🎁 어르신 혜택 찾기</a><Link href="/calc/wage">⏱️ 시급·주휴수당 계산기</Link></div></section>
    <Faq items={faq}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['노인일자리',SITE+'/senior'],[`${Y} 신청`,SITE+seniorPath]])}/>
  </div>;
}
