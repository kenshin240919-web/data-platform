import Link from 'next/link';
import type {Metadata} from 'next';
import {regions,sidos,SITE} from '../../lib/regions';
import {fmtDate,snapFetched,snapSum,snapTotal} from '../../lib/snapshot';
import {Faq} from '@guidejung/ui/seo';
export const metadata:Metadata={title:'지역별 전기차 충전소',description:'전국 시도·시군구별 전기차 충전소와 실시간 이용 가능 충전기를 지역을 골라 확인하세요.',alternates:{canonical:SITE+'/region'}};
export default function RegionIndex(){
  return <section className="section"><div className="eyebrow">ALL REGIONS</div><h1>지역별 전기차 충전소</h1>
    {sidos.map(s=><div key={s.code} className="ev-sido"><h2><Link href={`/region/${s.code}`}>{s.name} 충전소</Link></h2><div className="chips">{s.regions.map(r=><Link key={r.code} href={`/region/${r.code}`}>{r.name}</Link>)}</div></div>)}{snapTotal.stations>0&&(()=>{const by=sidos.map(s=>({s,n:snapSum(s.regions.map(r=>r.code))})).sort((a,b)=>b.n.stations-a.n.stations);
      return <Faq items={[['지역별 전기차 충전소는 어떻게 찾나요?',`시도 ${sidos.length}곳, 시군구 ${regions.length}곳별로 충전소 목록과 충전기별 실시간 상태를 볼 수 있습니다. 위에서 지역 이름을 누르세요.`],
        ['충전소가 가장 많은 시도와 적은 시도는 어디인가요?',`${fmtDate(snapFetched)} 기준 가장 많은 곳은 ${by[0].s.name}(${by[0].n.stations.toLocaleString()}곳), 가장 적은 곳은 ${by[by.length-1].s.name}(${by[by.length-1].n.stations.toLocaleString()}곳)입니다.`]]}/>;})()}</section>;
}
