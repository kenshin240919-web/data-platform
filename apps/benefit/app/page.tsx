import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {MyArea} from './_components/Live';
import {ItemList} from './_components/Cards';
import {Ad} from './_components/Ad';
import {byViews,dueSoon,fieldCount,FIELD_ORDER,FIELDS,items,n,nationItems,newest,regions,SITE,sidoList,status,today} from '../lib/data';
import {regionsLite} from '../lib/regions-lite';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const fc=fieldCount(items);const soon=dueSoon(items,45).slice(0,8);const popular=[...nationItems].sort(byViews).slice(0,10);const fresh=newest(items,8);
  const local=items.filter(i=>i.scope==='local').length,sido=items.filter(i=>i.scope==='sido').length;
  const cash=items.filter(i=>(i.kind??[]).some(k=>k.startsWith('현금'))).length;
  return <div className="page bf-home">
    <section className="bf-hero"><h1>우리 동네 지원금, 놓친 거 없어?</h1>
      <p>사는 곳·나이로 <b>받을 수 있는 혜택</b>만</p></section>
    <MyArea regions={regionsLite}/>
    {/* 전국 수치(검색엔진·AI 답변용): 첫 화면을 가볍게 하려고 히어로에서 3초 답 아래로 내림(10/29 사용자) */}
    <p className="muted small gj-facts">정부·시도·시군구가 주는 혜택 <b>{n(items.length)}가지</b>를 사는 곳과 나이·상황으로 찾아 드려요. 시군구 혜택 {n(local)} · 시도 혜택 {n(sido)} · 전국 혜택 {n(nationItems.length)}, 정부24 공공서비스 정보 기준이에요.</p>
    <a className="bf-band" href="/find"><span aria-hidden="true">🎯</span><span><span><b>나에게 맞는 혜택만</b> 골라 보기</span><small>사는 곳·나이·상황(임신·학생·구직·한부모·다자녀…)을 고르면 받을 수 있을지도 모르는 혜택만 보여 드려요</small></span><em>찾기 →</em></a>
    <Ad/>
    {soon.length>0&&<section><h2>📅 곧 마감되는 혜택</h2><ItemList list={soon} today={today}/><p><Link className="bf-more-link" href="/deadline">마감 임박 혜택 모두 보기 →</Link></p></section>}
    <section><h2>분야로 찾기</h2><div className="bf-cats">{FIELD_ORDER.map(f=><Link key={f} href={`/topic/${f}`}><span aria-hidden="true">{FIELDS[f].icon}</span><span><b>{FIELDS[f].label}</b><small>{n(fc[f])}가지</small></span></Link>)}</div></section>
    <section><h2>🔥 많이 찾는 전국 혜택</h2><ItemList list={popular} today={today}/></section>
    <section><h2>🆕 새로 생긴 혜택</h2><ItemList list={fresh} today={today}/><p><Link className="bf-more-link" href="/new">새 혜택 더 보기 →</Link></p></section>
    <section><h2>시도별 우리 동네 혜택</h2><div className="bf-sidos">{sidoList.map(s=>{const rs=regions.filter(r=>r.sido===s);return <Link key={s} href={`/region#${encodeURIComponent(s)}`}><b>{s}</b><small>시군구 {n(rs.length)}곳</small></Link>;})}</div></section>
    <Faq items={[
      ['우리 동네 지원금은 어떻게 찾나요?',`‘우리 동네 혜택 보기’를 누르면 내 위치로 사는 시군구를 찾아, 그 시군구·시도·국가가 주는 혜택을 한꺼번에 보여 드려요. 전체 ${n(items.length)}가지 중 시군구가 주는 혜택이 ${n(local)}가지예요.`],
      ['나에게 맞는 혜택만 볼 수 있나요?','‘나에게 맞는 혜택 찾기’에서 사는 곳·나이·상황·소득을 고르면, 정부24에 등록된 지원 대상 표시로 맞는 혜택만 골라 드려요. 고른 조건은 이 브라우저에만 저장돼요.'],
      ['돈으로 받는 혜택은 얼마나 되나요?',`지원 유형이 현금(수당·장려금·감면·장학금 등)인 혜택이 ${n(cash)}가지예요. 금액은 지원 내용에 적힌 것을 보여 드리고, 정확한 금액은 담당 기관에서 확인하세요.`],
      ['신청은 어디서 하나요?','혜택마다 정부24 안내와 온라인 신청 주소, 접수 기관·문의처를 적어 두었어요. 이 사이트는 민간 정보 서비스라 신청을 받지 않아요.'],
    ]}/>
    <Connect items={genericFor('benefit')}/>
    <JsonLd data={breadcrumbLd([['내근처 혜택',SITE+'/']])}/>
    <p className="muted small">정부24 공공서비스(혜택) 정보 기준 · 마지막 갱신 {status.updated_at.slice(0,10)} · 혜택 {n(status.count)}가지</p>
  </div>;
}
