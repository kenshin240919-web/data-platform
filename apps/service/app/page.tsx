import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {NearCenter} from './_components/NearCenter';
import {Checklist,RepairTypes} from './_components/Guide';
import {KIND_ORDER,KINDS,n,nation,regions,sidos,SITE,status,updated} from '../lib/data';
import {BRANDS} from '../lib/brands';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const k=nation.kinds;
  const top=[...regions].sort((a,b)=>b.kinds.repair-a.kinds.repair).slice(0,8);
  return <div className="page sv-home">
    <section className="sv-hero"><h1>고장 났다, 어디로 가지?</h1>
      <p>지자체에 등록된 자동차 정비소 <b>{n(k.repair)}곳</b> · 검사소 {n(k.inspect)}곳 · 세차장 {n(k.wash)}곳 · 배출가스 정비 {n(k.emission)}곳을 가까운 순으로 찾아 드려요.</p></section>
    <NearCenter/>
    <div className="sv-jump"><Link href="/inspection">🗓️ 검사 기한·과태료 계산기</Link><Link href="/inspection">{KINDS.inspect.icon} 내 주변 검사소 <small>{n(k.inspect)}</small></Link><Link href="/guide">✅ 맡기기 전 체크리스트</Link><Link href="/region">🗺️ 지역별 {KIND_ORDER.map(x=>KINDS[x].label).join('·')}</Link></div>
    <AdSlot/>
    <section><h2>📺 가전·휴대폰 서비스센터 <span className="muted">고객센터 번호</span></h2><div className="sv-brands">{BRANDS.map(b=><Link key={b.slug} href={`/brand/${b.slug}`} className="sv-brand"><span aria-hidden="true">{b.icon}</span><span><b>{b.name}</b><small>{b.phones[0]?.tel??'공식 지원 페이지'}</small></span></Link>)}</div></section>
    <RepairTypes counts={nation.subs}/>
    <Checklist/>
    <section><h2>정비소 많은 지역</h2><ol className="sv-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/repair`}><b>{r.name}</b><span>{n(r.kinds.repair)}곳</span></Link></li>)}</ol></section>
    <section><h2>시도별</h2><div className="sv-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <Faq items={[
      ['내 주변 정비소는 어떻게 찾나요?','‘내 위치 주변 정비소·검사소 보기’를 누르면 가까운 정비소와 검사소·세차장을 거리순으로 보여 드립니다. 위치를 허용하지 않으면 접속 지역 기준으로 보여 드립니다.'],
      ['1급·2급·3급 정비소는 무엇이 다른가요?','자동차관리법의 정비업 종류로, 흔히 1급은 모든 차를 종합 정비하는 종합정비업, 2급은 승용·소형차를 종합 정비하는 소형자동차종합정비업, 3급은 정해진 장치만 정비하는 전문정비업을 말합니다.'],
      ['정비소는 몇 곳이 등록돼 있나요?',`${updated()} 기준 영업 중으로 등록된 자동차 정비업체는 ${n(k.repair)}곳입니다.`],
      ['정비 맡기기 전에 무엇을 확인해야 하나요?','견적서를 받고(정비업자 발급 의무), 여러 곳을 비교하고, 정품·재생 부품 여부와 수리 기간을 적어 두고, 명세서를 보관하세요. 분쟁은 한국소비자원 1372에 상담할 수 있습니다.'],
      ['정보는 정확한가요?','지자체가 등록한 공공데이터를 매일 받아 보여 드립니다. 영업 시간·작업 범위는 다를 수 있으니 가기 전에 전화로 확인하세요.'],
    ]}/>
    <Connect items={genericFor('service')}/>
    <JsonLd data={breadcrumbLd([['내근처 서비스센터',SITE+'/']])}/>
    <p className="muted small">마지막 갱신 {updated()} · {n(status.count)}곳</p>
  </div>;
}
