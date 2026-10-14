import Link from 'next/link';
import type {Metadata} from 'next';
import {SITE,roadName,rests,routes} from '../../lib/data';
export const metadata:Metadata={title:'전국 고속도로 휴게소',description:`전국 고속도로 휴게소 ${rests.length}곳의 대표 음식, 기름값, 편의시설을 노선별로 확인하세요.`,alternates:{canonical:SITE+'/rest'}};
export default function RestIndex(){
  const groups=routes.map(r=>({r,list:rests.filter(x=>x.routeNo===r.no)})).filter(g=>g.list.length);
  return <section className="section"><div className="eyebrow">REST AREAS</div><h1>전국 고속도로 휴게소</h1>
    <p className="muted">휴게소 {rests.length}곳 · 대표 음식·기름값·편의시설</p>
    {groups.map(({r,list})=><div key={r.no} className="tf-group"><h2><Link href={`/road/${r.no}`}>{roadName(r)}</Link> <span className="muted small">{list.length}곳</span></h2>
      <div className="chips">{list.map(x=><Link key={x.code} href={`/rest/${x.code}`}>{x.name.replace(/휴게소$/,'')}</Link>)}</div></div>)}</section>;
}
