import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {FavList} from '@guidejung/ui/favlist';
import {NearJob} from './_components/NearJob';
import {Ad} from './_components/Ad';
import {KindCards,Official,Situations} from './_components/Guide';
import {n,nation,places,regions,sidos,SITE,status,SUBS,updated,type Sub} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const k=nation.kinds;
  const top=[...regions].sort((a,b)=>b.kinds.agency-a.kinds.agency).slice(0,8);
  const subs=Object.entries(places.reduce((a,p)=>(p.kind==='agency'&&p.sub&&(a[p.sub]=(a[p.sub]??0)+1),a),{} as Record<string,number>)).sort((a,b)=>b[1]-a[1]) as [Sub,number][];
  return <div className="page jb-home">
    <section className="jb-hero"><h1>일자리 찾을 때 가는 곳</h1>
      <p><b>우리 동네 관할 고용센터</b>와 가까운 직업소개소·새일센터를 한 번에</p></section>
    <FavList hint="상세에서 ☆ 즐겨찾기를 누르면 여기서 바로 볼 수 있어요."/>
    <NearJob/>
    <Situations/>
    <section><h2>🧮 계산기</h2><div className="jb-jump"><Link href="/calc/wage">⏱️ 시급·주휴수당·월급</Link><Link href="/calc/unemployment">🧾 실업급여</Link><Link href="/calc/severance">💼 퇴직금</Link><Link href="/calc/insurance">🧮 4대보험</Link></div></section>
    <p className="muted small gj-facts">전국 고용복지플러스센터 <b>{n(k.center)}곳</b> · 직업소개소 <b>{n(k.agency+k.free)}곳</b>(유료 {n(k.agency)}·무료 {n(k.free)}) · 여성새로일하기센터 {n(k.women)}곳 · 노인일자리 수행기관 {n(k.senior)}곳 · 대학일자리플러스센터 {n(k.campus)}곳 · 국가자격 시험장 {n(k.exam)}곳을 가까운 순으로 보여 드려요.</p>
    <Ad/>
    {subs.length>0&&<section><h2>🔨 어떤 일을 찾으세요? <small className="muted">직업소개소 이름 기준</small></h2><div className="jb-jump">{subs.map(([s,v])=><Link key={s} href={`/agency#${s}`}>{SUBS[s]} <small>{n(v)}</small></Link>)}</div></section>}
    <KindCards counts={k}/>
    <Official/>
    <section><h2>직업소개소 많은 지역</h2><ol className="jb-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/agency`}><b>{r.name}</b><span>{n(r.kinds.agency)}곳</span></Link></li>)}</ol></section>
    <section><h2>시도별</h2><div className="jb-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <Faq items={[
      ['실업급여는 어디서 신청하나요?','주민등록 주소지를 관할하는 고용센터(고용복지플러스센터)에서 신청합니다. 첫 화면의 ‘관할 고용센터’나 지역 페이지에서 내 동네 관할 센터를 확인하세요. 자격·금액은 고용24 공식 안내를 따르세요.'],
      ['근처 인력사무소는 어떻게 찾나요?',`‘내 위치로 보기’를 누르면 지자체에 등록된 직업소개소를 가까운 순으로 보여 드립니다. 전국 유료직업소개소 ${n(k.agency)}곳·무료직업소개소 ${n(k.free)}곳(${updated()} 기준)입니다.`],
      ['이 사이트에 채용 공고가 있나요?','없습니다. 채용 공고는 고용24·노인일자리 여기·e새일 같은 공식 사이트에서 찾으세요. 이 사이트는 일자리를 찾을 때 찾아가는 기관을 알려 드립니다.'],
      ['자격증 시험장은 어디서 찾나요?',`‘자격증 시험장’에서 한국산업인력공단이 등록한 국가자격 시험장 ${n(k.exam)}곳을 가까운 순으로 볼 수 있습니다. 국가기술자격 시험장은 원서를 접수할 때 고르고, 시험 날에는 수험표에 적힌 시험장으로 가요. 종목·회차마다 쓰는 시험장이 달라요. 일정·접수는 큐넷에서 하세요.`],
      ['경력이 끊긴 여성은 어디로 가나요?',`여성새로일하기센터(새일센터)에서 구직 상담과 직업교육을 받을 수 있습니다. 전국 ${n(k.women)}곳입니다.`],
    ]}/>
    <Connect items={genericFor('job')}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/']])}/>
    <p className="muted small">마지막 갱신 {updated()} · {n(status.count)}곳</p>
  </div>;
}
