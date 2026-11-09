import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearMovie} from '../_components/NearMovie';
import {TheaterCard} from '../_components/TheaterList';
import {Ad} from '../_components/Ad';
import {n,SITE,slim,theaters,updated} from '../../lib/data';
const list=theaters.filter(t=>t.drive);
export const metadata:Metadata={title:`자동차극장 전국 ${list.length}곳 · 내 주변 자동차극장`,description:`차 안에서 보는 자동차극장(드라이브인 극장) 전국 ${list.length}곳을 내 위치에서 가까운 순으로. 주소·전화·가까운 극장을 확인하세요.`,alternates:{canonical:'/drive'}};
export default function Drive(){
  const sidos=[...new Set(list.map(t=>t.region_name.split(' ')[0]))];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 자동차극장</nav>
    <h1>🚗 내 주변 자동차극장</h1>
    <NearMovie drive/>
    <Ad/>
    {sidos.map(s=><section key={s}><h2>{s}</h2><div className="mv-cards">{list.filter(t=>t.region_name.split(' ')[0]===s).map(t=><TheaterCard key={t.id} p={slim(t)}/>)}</div></section>)}
    <Faq items={[
      ['자동차극장은 전국에 몇 곳인가요?',`${updated()} 기준 지자체에 자동차극장으로 등록된 곳은 ${n(list.length)}곳입니다(${sidos.join('·')}).`],
      ['자동차극장 상영 시간은 어디서 보나요?','자동차극장은 실시간 상영 시간을 받을 수 없어, 극장 페이지의 전화번호나 극장 누리집·SNS에서 확인해야 합니다.'],
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],['자동차극장',SITE+'/drive']])}/>
  </div>;
}
