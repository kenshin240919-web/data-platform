import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {FavList} from '@guidejung/ui/favlist';
import {NearPet} from './_components/NearPet';
import {NearAnimals} from './_components/Animals';
import {Ad} from './_components/Ad';
import {HoursNote,KindCards,KindGuide,SickGuide} from './_components/Guide';
import {animals,is24,KINDS,lostAnimals,n,nation,places,placePath,regions,sidos,SITE,status,updated} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const k=nation.kinds;
  const top=[...regions].sort((a,b)=>b.kinds.hospital-a.kinds.hospital).slice(0,8);
  const top24=[...regions].filter(r=>r.h24).sort((a,b)=>b.h24-a.h24).slice(0,8);
  const fresh=places.filter(p=>p.kind==='hospital'&&p.since).sort((a,b)=>b.since!.localeCompare(a.since!)).slice(0,6);
  return <div className="page pt-home">
    <section className="pt-hero"><h1>우리 아이 아플 때 어디로?</h1>
      <p>지자체에 신고된 동물병원 <b>{n(k.hospital)}곳</b>(24시 {n(nation.h24)}곳) · 동물약국 {n(k.pharmacy)}곳 · 동물보호센터 {n(k.shelter)}곳(보호 중 {n(animals.length)}마리) · 펫호텔·유치원 {n(k.hotel)}곳 · 애견·고양이 카페 {n(k.cafe)}곳 · 펫택시 {n(k.taxi)}곳을 가까운 순으로 찾아 드려요.</p></section>
    <FavList hint="병원 상세에서 ☆ 즐겨찾기를 누르면 우리 아이 병원을 여기서 바로 볼 수 있어요."/>
    <NearPet/>
    <div className="pt-jump"><Link href="/24h">🚨 24시 동물병원 <small>{n(nation.h24)}</small></Link><Link href="/pharmacy">💊 지금 문 연 동물약국</Link><Link href="/hotel">🏨 펫호텔 <small>{n(k.hotel)}</small></Link><Link href="/taxi">🚕 펫택시 <small>{n(k.taxi)}</small></Link><Link href="/adopt">🐾 보호 중인 아이들 <small>{n(animals.length)}</small></Link><Link href="/lost">🔎 실종 동물 <small>{n(lostAnimals.length)}</small></Link><Link href="/guide">🚑 아플 때 순서</Link></div>
    <Ad/>
    <KindCards counts={k} h24={nation.h24}/>
    <SickGuide/>
    {animals.length>0&&<NearAnimals/>}
    {fresh.length>0&&<section><h2>🆕 새로 문 연 동물병원</h2><div className="pt-cards">{fresh.map(p=><a key={p.id} className="pt-card pt-card-main" href={placePath(p.id)}><span className="pt-kind" aria-hidden="true">{KINDS[p.kind].icon}</span><span className="pt-card-body"><b>{p.name}</b><small>{p.region_name} · {p.since} 개설</small></span></a>)}</div></section>}
    <HoursNote/>
    <section><h2>24시 동물병원 많은 지역</h2><ol className="pt-rank">{top24.map(r=><li key={r.id}><Link href={`/region/${r.id}/hospital`}><b>{r.name}</b><span>{n(r.h24)}곳</span></Link></li>)}</ol></section>
    <section><h2>동물병원 많은 지역</h2><ol className="pt-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/hospital`}><b>{r.name}</b><span>{n(r.kinds.hospital)}곳</span></Link></li>)}</ol></section>
    <section><h2>시도별</h2><div className="pt-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>동물병원 {n(s.hospital)}</span></Link>)}</div></section>
    <KindGuide/>
    <Faq items={[
      ['내 주변 동물병원은 어떻게 찾나요?','‘내 위치 주변 동물병원·동물약국 보기’를 누르면 가까운 동물병원과 동물약국·펫호텔·애견 카페·펫택시를 거리순으로 보여 드립니다. 위치를 허용하지 않으면 접속 지역 기준으로 보여 드립니다.'],
      ['24시 동물병원은 몇 곳인가요?',`${updated()} 기준 이름에 ‘24’가 들어간 동물병원은 ${n(nation.h24)}곳입니다. 실제 야간 진료 여부는 가기 전에 전화로 확인하세요.`],
      ['지금 문 연 동물약국도 알 수 있나요?',`네. 동물약국 ${n(k.pharmacy)}곳 중 약국 영업 시간이 확인된 ${n(nation.withHours)}곳은 지금 영업 중인지 바로 보여 드립니다.`],
      ['동물병원 진료 시간은 어디서 보나요?','공공데이터에는 진료 시간이 없습니다. 병원 상세의 ‘네이버 지도에서 진료 시간 보기’나 전화로 확인하세요.'],
      ['정보는 정확한가요?','행정안전부 지방행정 인허가데이터를 매일 받아 영업 중인 곳만 보여 드립니다. 폐업 신고가 늦은 곳이 있을 수 있으니 가기 전에 전화로 확인하세요.'],
    ]}/>
    <Connect items={genericFor('pet')}/>
    <JsonLd data={breadcrumbLd([['내근처 동물병원',SITE+'/']])}/>
    <p className="muted small">마지막 갱신 {updated()} · {n(status.count)}곳 · 24시는 이름 기준 {n(places.filter(is24).length)}곳</p>
  </div>;
}
