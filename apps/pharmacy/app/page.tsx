import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {NearNow} from './_components/NearNow';
import {CONDITIONS,n,nation,regions,sidos,SITE,status,updated,type Cond} from '../lib/data';
import {FavList} from '@guidejung/ui/favlist';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const top=(c:Cond)=>[...regions].sort((a,b)=>b.cond[c]-a.cond[c]).slice(0,8);
  return <div className="page ph-home">
    <section className="ph-hero"><h1>지금 문 연 약국 어디?</h1>
      <p>전국 약국 <b>{n(status.count)}곳</b>의 요일별 운영 시간으로 <b>지금 영업 중</b>인 곳을 가까운 순으로 보여 드려요. 심야 {n(nation.night)}곳 · 일요일 {n(nation.sunday)}곳 · 공휴일 {n(nation.holiday)}곳.</p></section>
    <FavList hint="약국 상세에서 ☆ 즐겨찾기를 누르면 여기서 바로 지금 영업 중인지 볼 수 있어요."/>
    <NearNow/>
    <AdSlot/>
    {(['night','sunday','holiday'] as Cond[]).map(c=><section key={c}><h2>{CONDITIONS[c].title} 많은 지역</h2>
      <ol className="ph-rank">{top(c).map(r=><li key={r.id}><Link href={`/region/${r.id}/${c}`}><b>{r.name}</b><span>{n(r.cond[c])}곳</span></Link></li>)}</ol></section>)}
    <section><h2>시도별 약국</h2><div className="ph-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <Faq items={[
      ['지금 문 연 약국은 어떻게 찾나요?','‘내 위치 주변 문 연 약국 보기’를 누르면 가까운 순으로 지금 영업 중인 약국과 닫는 시간을 보여 드립니다. 위치를 허용하지 않으면 접속 지역 기준으로 보여 드립니다.'],
      ['밤늦게 여는 약국은 몇 곳인가요?',`${updated()} 기준 평일 밤 10시 이후까지 여는 약국은 전국 ${n(nation.night)}곳입니다.`],
      ['일요일·공휴일에 여는 약국은 몇 곳인가요?',`일요일 운영 시간이 등록된 약국은 ${n(nation.sunday)}곳, 공휴일 운영 시간이 등록된 약국은 ${n(nation.holiday)}곳입니다.`],
      ['운영 시간은 정확한가요?','약국이 국립중앙의료원에 신고한 시간을 매일 받아 보여 드립니다. 명절·임시 휴무는 다를 수 있으니 가기 전에 전화로 확인하세요.'],
    ]}/>
    <Connect items={genericFor('pharmacy')}/>
    <JsonLd data={breadcrumbLd([['내근처 약국',SITE+'/']])}/>
  </div>;
}
