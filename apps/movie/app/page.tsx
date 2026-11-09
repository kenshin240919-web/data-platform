import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {FavList} from '@guidejung/ui/favlist';
import {NearMovie} from './_components/NearMovie';
import {BoxOffice} from './_components/Live';
import {Ad} from './_components/Ad';
import {CHAIN_ORDER,CHAINS,n,nation,regions,sidos,SITE,specials,status,updated} from '../lib/data';

export const metadata:Metadata={alternates:{canonical:'/'}};
export default function Home(){
  const c=nation.chains;
  const top=[...regions].sort((a,b)=>b.count-a.count).slice(0,8);
  const sp=specials().slice(0,6);
  return <div className="page mv-home">
    <section className="mv-hero"><h1>지금 뭐 볼 수 있어?</h1>
      <p>내 주변 극장을 가까운 순으로, <b>곧 시작하는 영화</b>와 남은 좌석까지</p></section>
    <FavList hint="극장 페이지에서 ☆ 즐겨찾기를 누르면 여기서 바로 볼 수 있어요."/>
    <NearMovie/>
    <p className="muted small gj-facts">전국 영화관 <b>{n(status.count)}곳</b>·상영관 {n(status.screens)}개(CGV {n(c.cgv)} · 롯데시네마 {n(c.lotte)} · 메가박스 {n(c.mega)} · 씨네Q {n(c.cineq)} · 작은·독립 {n(c.indie)}, 자동차극장 {n(status.drive)})를 가까운 순으로 찾아 드려요.</p>
    <div className="mv-jump">{CHAIN_ORDER.map(k=><Link key={k} href={`/chain/${k}`}>{CHAINS[k].label} <small>{n(c[k])}</small></Link>)}<Link href="/drive">🚗 자동차극장</Link><Link href="/boxoffice">🏆 박스오피스</Link><Link href="/region">🗺️ 지역별</Link></div>
    <Ad/>
    <BoxOffice limit={5}/>
    <section><h2>영화관 많은 지역</h2><ol className="mv-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}`}><b>{r.name}</b><span>{n(r.count)}곳</span></Link></li>)}</ol></section>
    {sp.length>0&&<section><h2>특별관 있는 극장</h2><p className="muted small">상영관 이름에 적힌 것 기준이에요(본사 공식 목록 아님).</p><div className="mv-tags">{sp.map(([k,v])=><span key={k}>{k} {n(v)}곳</span>)}</div></section>}
    <section><h2>시도별</h2><div className="mv-sidos">{sidos.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}곳</span></Link>)}</div></section>
    <Faq items={[
      ['내 주변 영화관은 어떻게 찾나요?',`‘내 위치 주변 보기’를 누르면 지자체에 등록된 영화관 ${n(status.count)}곳 가운데 가까운 순으로 보여 드리고, 가까운 극장 2곳의 곧 시작하는 영화도 함께 보여 드립니다.`],
      ['남은 좌석은 정확한가요?','CGV·롯데시네마·메가박스 앱 정보를 공개 중계로 받아 5분마다 새로 보여 드리는 비공식 안내입니다. 예매 직전에는 극장 공식 앱·누리집에서 다시 확인하세요.'],
      ['박스오피스는 언제 기준인가요?','영화진흥위원회 통합전산망의 어제 하루 관객 수 기준 순위를 방문할 때마다 바로 확인해 보여 드립니다.'],
      ['작은 영화관·독립 영화관도 있나요?',`네. 체인이 아닌 극장 ${n(c.indie)}곳(작은 영화관·예술영화관·자동차극장 포함)도 함께 보여 드립니다. 이 극장들은 실시간 상영 시간이 없어 전화나 누리집으로 확인해야 합니다.`],
    ]}/>
    <Connect items={genericFor('movie')}/>
    <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/']])}/>
    <p className="muted small">마지막 갱신 {updated()} · 극장 {n(status.count)}곳</p>
  </div>;
}
