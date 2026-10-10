import Link from 'next/link';
import type {Metadata} from 'next';
import {label,sidos,SITE} from '../../lib/regions';

export const metadata:Metadata={title:'전국 지역별 날씨',description:'전국 시도·시군구별 오늘 날씨와 주간 예보, 미세먼지를 지역을 골라 확인하세요.',alternates:{canonical:SITE+'/region'}};
export default function RegionIndex(){
  return <section className="section">
    <div className="eyebrow">ALL REGIONS</div><h1>전국 지역별 날씨</h1>
    {sidos.map(s=><div key={s.code} className="wx-sido-block">
      <h2><Link href={`/region/${s.code}`}>{s.name} 날씨</Link></h2>
      <div className="chips">{s.regions.map(r=><Link key={r.code} href={`/region/${r.code}`}>{r.name}</Link>)}</div>
    </div>)}
    <p className="muted small">{sidos.reduce((n,s)=>n+s.regions.length,0)}개 시군구 · {sidos.map(s=>label(s.capital)).slice(0,3).join(', ')} 등</p>
  </section>;
}
