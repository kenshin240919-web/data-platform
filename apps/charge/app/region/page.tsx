import Link from 'next/link';
import type {Metadata} from 'next';
import {sidos,SITE} from '../../lib/regions';
export const metadata:Metadata={title:'지역별 전기차 충전소',description:'전국 시도·시군구별 전기차 충전소와 실시간 이용 가능 충전기를 지역을 골라 확인하세요.',alternates:{canonical:SITE+'/region'}};
export default function RegionIndex(){
  return <section className="section"><div className="eyebrow">ALL REGIONS</div><h1>지역별 전기차 충전소</h1>
    {sidos.map(s=><div key={s.code} className="ev-sido"><h2><Link href={`/region/${s.code}`}>{s.name} 충전소</Link></h2><div className="chips">{s.regions.map(r=><Link key={r.code} href={`/region/${r.code}`}>{r.name}</Link>)}</div></div>)}</section>;
}
