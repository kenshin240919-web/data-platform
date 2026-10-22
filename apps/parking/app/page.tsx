import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {NearPark} from './_components/NearPark';
import {n,nation,refMonth,regions,sidos,SITE,status,updated} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const free=[...regions].sort((a,b)=>b.cond.free-a.cond.free).slice(0,8);
  const cheap=regions.filter(r=>r.hour!=null&&r.count-r.cond.free>=10).sort((a,b)=>a.hour!-b.hour!).slice(0,8);
  return <div className="page pk-home">
    <section className="pk-hero"><h1>여기 주차 어디 해?</h1>
      <p>지자체가 등록한 전국 주차장 <b>{n(status.count)}곳</b>(대부분 공영)에서 가까운 곳과 싼 곳을 찾아 드려요. 무료 {n(nation.free)}곳{nation.hour!=null&&<> · 유료 1시간 보통 {n(nation.hour)}원</>}.</p></section>
    <NearPark/>
    <AdSlot/>
    <section><h2>무료 주차장 많은 지역</h2>
      <ol className="pk-rank">{free.map(r=><li key={r.id}><Link href={`/region/${r.id}/free`}><b>{r.name}</b><span>{n(r.cond.free)}곳</span></Link></li>)}</ol></section>
    {cheap.length>0&&<section><h2>공영 주차장 1시간 요금이 싼 지역 <span className="muted">유료 10곳 이상</span></h2>
      <ol className="pk-rank">{cheap.map(r=><li key={r.id}><Link href={`/region/${r.id}`}><b>{r.name}</b><span>{n(r.hour!)}원</span></Link></li>)}</ol></section>}
    <section><h2>시도별 주차장</h2><div className="pk-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <Faq items={[
      ['내 주변 주차장은 어떻게 찾나요?','‘내 위치 주변 주차장 보기’를 누르면 가까운 공영 주차장과 무료 주차장, 주차 시간별 예상 요금을 보여 드립니다. 위치를 허용하지 않으면 접속 지역 기준으로 보여 드립니다.'],
      ['무료 주차장은 몇 곳인가요?',`${updated()} 기준 지자체가 등록한 주차장 ${n(status.count)}곳 중 무료는 ${n(nation.free)}곳입니다.`],
      ['공영 주차장 1시간 요금은 보통 얼마인가요?',nation.hour!=null?`요금을 계산할 수 있는 유료 주차장 기준 1시간 요금의 중앙값은 ${n(nation.hour)}원입니다. 지역마다 다르니 지역 페이지에서 확인하세요.`:'지역 페이지에서 주차장별 요금을 확인하세요.'],
      ['요금과 운영 시간은 정확한가요?',`지자체가 등록한 정보(기준일 대부분 ${refMonth()})를 매일 받아 보여 드립니다. 현장 요금·할인과 다를 수 있으니 안내판을 확인하세요.`],
      ['상가·건물 주차장도 나오나요?','원본 데이터가 지자체 등록 주차장이라 대부분 공영 주차장이고, 민간 건물·상가 주차장은 거의 없습니다.'],
    ]}/>
    <Connect items={genericFor('parking')}/>
    <JsonLd data={breadcrumbLd([['내근처 주차장',SITE+'/']])}/>
  </div>;
}
