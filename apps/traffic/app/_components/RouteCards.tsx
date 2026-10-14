'use client';
import Link from 'next/link';
import {roadName,type Route} from '../../lib/format';
import {useTraffic} from './live';

/** 노선 카드 목록: 실시간이 오면 노선마다 정체·서행 구간 수를 붙인다. */
export function RouteCards({routes}:{routes:Pick<Route,'no'|'name'|'start'|'end'|'E'|'S'>[]}){
  const {data}=useTraffic();
  return <div className="region-links tf-routes">{routes.map(r=>{
    const ids=[...r.E,...r.S].map(z=>z[0]);const jam=data?ids.filter(id=>data.zones[id]?.[1]===3).length:0,slow=data?ids.filter(id=>data.zones[id]?.[1]===2).length:0;
    return <Link key={r.no} href={`/road/${r.no}`} className={jam?'jam':slow?'slow':''}><strong>{roadName(r)}</strong>
      <span>{data?(jam||slow?`정체 ${jam} · 서행 ${slow}`:'원활'):`${r.start} ↔ ${r.end}`}</span></Link>;})}</div>;
}
