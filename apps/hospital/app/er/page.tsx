import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {ErList} from '../_components/ErList';
import {erCount,n,regions,sidos,SITE} from '../../lib/data';
export const metadata:Metadata={title:'응급실 · 내 주변 응급실과 실시간 남은 병상',description:`전국 응급실 ${n(erCount)}곳. 내 주변 가까운 응급실과 국립중앙의료원이 알려 주는 실시간 응급실 남은 병상을 확인하세요.`,alternates:{canonical:'/er'}};
export default function Er(){
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 응급실</nav>
    <h1>🚑 응급실</h1>
    <p className="hp-answer">위급한 상황이면 <b>바로 119</b>에 전화하세요. 아래는 가까운 응급실과 실시간 응급실 남은 병상이에요(국립중앙의료원, 몇 분마다 갱신).</p>
    <ErList/>
    <AdSlot/>
    {sidos.map(s=>{const list=regions.filter(r=>s.regions.includes(r)).flatMap(r=>r.er);return list.length?<section key={s.name}><h2>{s.name} 응급실 <span className="muted">{n(list.length)}곳</span></h2>
      <ul className="hp-links">{list.map(c=><li key={c.id}><a href={`/hospital/${c.id}`}>{c.name}</a> <span className="muted">· {c.address}</span></li>)}</ul></section>:null;})}
    <Faq items={[['응급실 남은 병상은 정확한가요?','국립중앙의료원 응급의료포털이 병원에서 받아 공개하는 실시간 값으로, 몇 분 늦거나 실제와 다를 수 있습니다. 가기 전에 병원 응급실에 전화로 확인하고, 위급하면 119에 전화하세요.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 병원',SITE+'/'],['응급실',SITE+'/er']])}/>
  </div>;
}
