import Link from 'next/link';
import type {Metadata} from 'next';
import {Connect,genericFor} from '@guidejung/ui/network';
import {SITE,roadName,rests,routes} from '../../lib/data';
import {Faq} from '@guidejung/ui/seo';
export const metadata:Metadata={title:'전국 고속도로 휴게소',description:`전국 고속도로 휴게소 ${rests.length}곳의 대표 음식, 기름값, 편의시설을 노선별로 확인하세요.`,alternates:{canonical:SITE+'/rest'}};
export default function RestIndex(){
  const groups=routes.map(r=>({r,list:rests.filter(x=>x.routeNo===r.no)})).filter(g=>g.list.length);
  return <section className="section"><div className="eyebrow">REST AREAS</div><h1>전국 고속도로 휴게소</h1>
    <p className="muted">휴게소 {rests.length}곳 · 대표 음식·기름값·편의시설</p>
    {groups.map(({r,list})=><div key={r.no} className="tf-group"><h2><Link href={`/road/${r.no}`}>{roadName(r)}</Link> <span className="muted small">{list.length}곳</span></h2>
      <div className="chips">{list.map(x=><Link key={x.code} href={`/rest/${x.code}`}>{x.name.replace(/휴게소$/,'')}</Link>)}</div></div>)}<Faq items={[['전국 고속도로 휴게소는 몇 곳인가요?',`한국도로공사 자료 기준 ${rests.length}곳입니다. 노선별로 묶어 위에 보여 드립니다.`],
      ['휴게소가 가장 많은 고속도로는 어디인가요?',[...groups].sort((a,b)=>b.list.length-a.list.length).slice(0,3).map(g=>`${roadName(g.r)}(${g.list.length}곳)`).join(', ')+' 순입니다.'],
      ['휴게소 대표 음식과 기름값은 어디서 보나요?','휴게소 이름을 누르면 대표 음식과 가격, 휘발유·경유 가격(전국 평균 대비), 편의시설, 주변 충전소·날씨를 볼 수 있습니다.']]}/><Connect items={genericFor('traffic')}/></section>;
}
