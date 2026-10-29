import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {FavList} from '@guidejung/ui/favlist';
import {NearCivil} from './_components/NearCivil';
import {PrintNear} from './_components/PrintNear';
import {Ad} from './_components/Ad';
import {DocChips,HowTo,KindCards} from './_components/Guide';
import {allDayKiosks,docs,n,nation,regions,sidos,SITE,status,updated,weekendKiosks} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const k=nation.kinds;
  const top=[...regions].sort((a,b)=>b.kinds.kiosk-a.kinds.kiosk).slice(0,8);
  return <div className="page cv-home">
    <section className="cv-hero"><h1>떼고, 뽑고, 부치는 곳</h1>
      <p><b>지금 쓸 수 있는</b> 무인발급기·주민센터를 가까운 순으로</p></section>
    <FavList hint="상세에서 ☆ 즐겨찾기를 누르면 여기서 바로 볼 수 있어요."/>
    <NearCivil/>
    {/* 전국 수치(검색엔진·AI 답변용): 첫 화면을 가볍게 하려고 히어로에서 3초 답 아래로 내림(10/29 사용자) */}
    <p className="muted small gj-facts">전국 무인민원발급기 <b>{n(k.kiosk)}대</b>(주말·공휴일에도 쓰는 곳 {n(weekendKiosks.length)}대) · 주민센터 {n(k.office)}곳 · 여권 발급 {n(k.passport)}곳 · 우체국 {n(k.post)}곳을 가까운 순으로, 지금 운영 중인 곳부터 보여 드려요.</p>
    <DocChips items={docs}/>
    <div className="cv-jump"><Link href="/weekend">📅 주말·공휴일 발급기 <small>{n(weekendKiosks.length)}</small></Link>{allDayKiosks.length>0&&<Link href="/weekend#allday">🌙 24시간 발급기 <small>{n(allDayKiosks.length)}</small></Link>}<Link href="/cso">⏱️ 구청 민원실 실시간 대기 <small>{n(k.cso)}</small></Link><Link href="/passport">🛂 여권 발급</Link></div>
    <Ad/>
    <PrintNear compact/>
    <KindCards counts={k}/>
    <HowTo/>
    <section><h2>무인민원발급기 많은 지역</h2><ol className="cv-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/kiosk`}><b>{r.name}</b><span>{n(r.kinds.kiosk)}대</span></Link></li>)}</ol></section>
    <section><h2>시도별</h2><div className="cv-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <Faq items={[
      ['내 주변 무인민원발급기는 어떻게 찾나요?','‘내 위치 주변 무인민원발급기 보기’를 누르면 가까운 발급기를 지금 운영 중인 곳부터 보여 드립니다. 위치를 허용하지 않으면 접속 지역 기준으로 보여 드립니다.'],
      ['주말에도 서류를 뗄 수 있나요?',`네. 주말·공휴일 운영 시간이 등록된 무인민원발급기가 전국 ${n(weekendKiosks.length)}대 있습니다(${updated()} 기준). 주말 발급기 페이지에서 확인하세요.`],
      ['무인민원발급기는 몇 대 있나요?',`${updated()} 기준 전국 ${n(k.kiosk)}대입니다.`],
      ['발급기마다 뗄 수 있는 서류가 다른가요?','네. 기계마다 서류 목록이 다릅니다. 상세 페이지에서 뗄 수 있는 서류 전체를 확인하세요.'],
      ['정부24에서 뗀 서류는 어디서 뽑나요?','집에 프린터가 없으면 근처 무인 프린트·프린트카페에서 뽑을 수 있습니다(출력 방법은 서류마다 정부24 안내를 따르세요). ‘무인 프린트’ 메뉴에서 가까운 곳을 찾으세요.'],
    ]}/>
    <Connect items={genericFor('civil')}/>
    <JsonLd data={breadcrumbLd([['내근처 서류',SITE+'/']])}/>
    <p className="muted small">마지막 갱신 {updated()} · {n(status.count)}곳</p>
  </div>;
}
