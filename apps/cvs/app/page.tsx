import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {FavList} from '@guidejung/ui/favlist';
import {NearCvs} from './_components/NearCvs';
import {Ad} from './_components/Ad';
import {MedicineGuide,NightSteps} from './_components/Guide';
import {BRAND_ORDER,BRANDS,n,nation,regions,sidos,SITE,status,updated} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const b=nation.brands;
  const top=[...regions].sort((a,c)=>c.count-a.count).slice(0,8);
  const lonely=[...regions].filter(r=>r.no_ph>0).sort((a,c)=>c.no_ph-a.no_ph).slice(0,8);
  return <div className="page cv-home">
    <section className="cv-hero"><h1>밤에도 상비약 어디서?</h1>
      <p>약국이 닫으면 <b>상비약 파는 편의점</b>을 가까운 순으로</p>
      <Link className="cv-season" href="/bungeoppang">🐟 붕어빵·🍠 군고구마 파는 편의점 찾기 →</Link></section>
    <FavList hint="매장 상세에서 ☆ 즐겨찾기를 누르면 여기서 바로 볼 수 있어요."/>
    <NearCvs/>
    <p className="muted small gj-facts">안전상비의약품 판매자로 등록된 편의점·마트 전국 <b>{n(status.count)}곳</b>(CU {n(b.cu)} · GS25 {n(b.gs25)} · 세븐일레븐 {n(b.seven)} · 이마트24 {n(b.emart24)} · 미니스톱 {n(b.ministop)} · 기타 {n(b.other)})을 가까운 순으로 찾아 드려요.</p>
    <div className="cv-jump">{BRAND_ORDER.filter(k=>k!=='other').map(k=><Link key={k} href={`/brand/${k}`}>{BRANDS[k].label} <small>{n(b[k])}</small></Link>)}<Link href="/bungeoppang">🐟 붕어빵</Link><Link href="/half-delivery">📦 반값택배</Link><Link href="/atm">🏧 현금 출금</Link><Link href="/closing-sale">🏷️ 마감할인</Link><Link href="/region">🗺️ 지역별</Link><Link href="/medicine">📋 상비약 안내</Link></div>
    <Ad/>
    <NightSteps/>
    <section><h2>상비약 파는 편의점 많은 지역</h2><ol className="cv-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}`}><b>{r.name}</b><span>{n(r.count)}곳</span></Link></li>)}</ol></section>
    {lonely.length>0&&<section><h2>1km 안에 약국이 없는 편의점이 많은 지역</h2><p className="muted small">약국이 멀어 편의점 상비약이 더 요긴한 곳이에요(가장 가까운 약국까지 직선거리 기준).</p><ol className="cv-rank">{lonely.map(r=><li key={r.id}><Link href={`/region/${r.id}`}><b>{r.name}</b><span>{n(r.no_ph)}곳</span></Link></li>)}</ol></section>}
    <section><h2>시도별</h2><div className="cv-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <MedicineGuide/>
    <Faq items={[
      ['편의점에서 파는 상비약은 어디서 살 수 있나요?',`안전상비의약품 판매자로 등록된 편의점·마트에서만 팔 수 있습니다. ${updated()} 기준 전국 ${n(status.count)}곳이 등록돼 있고, ‘내 위치 주변 보기’를 누르면 가까운 순으로 보여 드립니다.`],
      ['상비약 파는 편의점은 밤에도 여나요?','약사법 제44조의2에 따라 판매자로 등록하려면 24시간 연중 무휴 점포를 갖춰야 합니다. 다만 실제 영업 시간은 바뀔 수 있으니 급하면 전화로 확인하세요.'],
      ['어느 편의점이 가장 많이 등록돼 있나요?',`상호 기준 CU ${n(b.cu)}곳, GS25 ${n(b.gs25)}곳, 세븐일레븐 ${n(b.seven)}곳, 이마트24 ${n(b.emart24)}곳, 미니스톱 ${n(b.ministop)}곳입니다(${updated()} 기준).`],
      ['지금 문 연 약국도 볼 수 있나요?','네. 내 주변 결과와 함께 2km 안 지금 문 연 약국 수를 보여 드리고, 매장 상세에 가장 가까운 약국과 응급실을 적어 두었습니다.'],
      ['어떤 약을 사야 하나요?','이 사이트는 약을 추천하거나 복용법을 안내하지 않습니다. 약 상자의 사용상 주의사항을 읽고, 증상이 심하면 약국·병원에 문의하세요.'],
    ]}/>
    <Connect items={genericFor('cvs')}/>
    <JsonLd data={breadcrumbLd([['내근처 편의점',SITE+'/']])}/>
    <p className="muted small">마지막 갱신 {updated()} · {n(status.count)}곳</p>
  </div>;
}
