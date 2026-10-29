import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {FavList} from '@guidejung/ui/favlist';
import {NearRest} from './_components/NearRest';
import {Ad} from './_components/Ad';
import {KindCards,KindGuide,PriceNote} from './_components/Guide';
import {KINDS,n,nation,places,regions,shopPath,sidos,SITE,status,updated} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const k=nation.kinds;
  const top=[...regions].sort((a,b)=>b.kinds.sauna-a.kinds.sauna).slice(0,8);
  const fresh=places.filter(p=>p.kind==='private'&&p.since).sort((a,b)=>b.since!.localeCompare(a.since!)).slice(0,6);
  return <div className="page rs-home">
    <section className="rs-hero"><h1>오늘 어디서 쉬지?</h1>
      <p>찜질방·사우나·목욕탕을 <b>가까운 순</b>으로</p></section>
    <FavList hint="업소 상세에서 ☆ 즐겨찾기를 누르면 여기서 바로 볼 수 있어요."/>
    <NearRest/>
    {/* 전국 수치(검색엔진·AI 답변용): 첫 화면을 가볍게 하려고 히어로에서 3초 답 아래로 내림(10/29 사용자) */}
    <p className="muted small gj-facts">지자체에 신고된 찜질방·사우나·목욕탕 <b>{n(k.sauna)}곳</b> · 1인 목욕·세신 {n(k.private)}곳 · 안마원 {n(k.anma)}곳 · 피부관리실 {n(k.skin)}곳을 가까운 순으로 찾아 드려요.</p>
    <div className="rs-jump"><Link href="/private">🛁 1인 목욕탕·세신샵 <small>{n(k.private)}</small></Link><Link href="/sauna">♨️ 찜질방·목욕탕 <small>{n(k.sauna)}</small></Link><Link href="/region">🗺️ 지역별</Link><Link href="/guide">📋 이용 안내</Link></div>
    <Ad/>
    <KindCards counts={k}/>
    {fresh.length>0&&<section><h2>🛁 새로 신고된 1인·프라이빗 목욕·세신</h2><div className="rs-cards">{fresh.map(p=><a key={p.id} className="rs-card rs-card-main" href={shopPath(p.id)}><span className="rs-kind" aria-hidden="true">{KINDS[p.kind].icon}</span><span className="rs-card-body"><b>{p.name}</b><small>{p.region_name} · {p.since} 신고</small></span></a>)}</div>
      <p><Link className="rs-more-link" href="/private">전국 1인 목욕·세신 {n(k.private)}곳 모두 보기 →</Link></p></section>}
    <PriceNote/>
    <section><h2>찜질방·목욕탕 많은 지역</h2><ol className="rs-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/sauna`}><b>{r.name}</b><span>{n(r.kinds.sauna)}곳</span></Link></li>)}</ol></section>
    <section><h2>시도별</h2><div className="rs-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <KindGuide/>
    <Faq items={[
      ['내 주변 찜질방은 어떻게 찾나요?','‘내 위치 주변 찜질방·목욕탕 보기’를 누르면 가까운 찜질방·사우나·목욕탕과 1인 목욕·안마원·피부관리실을 거리순으로 보여 드립니다. 위치를 허용하지 않으면 접속 지역 기준으로 보여 드립니다.'],
      ['1인 목욕탕·세신샵도 나오나요?',`네. 목욕장업·미용업으로 신고된 1인·프라이빗 목욕탕과 세신샵 ${n(k.private)}곳을 따로 모았습니다(${updated()} 기준).`],
      ['찜질방·목욕탕은 몇 곳이 신고돼 있나요?',`${updated()} 기준 영업 중으로 신고된 찜질방·사우나·목욕탕은 ${n(k.sauna)}곳입니다.`],
      ['가격과 영업 시간은 어디서 보나요?','공공데이터에는 가격·예약·영업 시간이 없습니다. 업소 상세의 ‘네이버 지도에서 가격·예약 보기’나 전화로 확인하세요.'],
      ['정보는 정확한가요?','행정안전부 지방행정 인허가데이터를 매일 받아 영업 중인 곳만 보여 드립니다. 폐업 신고가 늦은 곳이 있을 수 있으니 가기 전에 전화로 확인하세요.'],
    ]}/>
    <Connect items={genericFor('rest')}/>
    <JsonLd data={breadcrumbLd([['내근처 휴식',SITE+'/']])}/>
    <p className="muted small">마지막 갱신 {updated()} · {n(status.count)}곳</p>
  </div>;
}
