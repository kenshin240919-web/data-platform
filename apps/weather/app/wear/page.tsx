import {SITE as SITE_} from '../../lib/regions';
import type {Metadata} from 'next';
import {Connect,genericFor} from '@guidejung/ui/network';
import {AdSlot} from '@guidejung/ui/ads';
import {WearToday} from '../_components/WearToday';
import {clothes} from '../../lib/format';
import {SITE} from '../../lib/regions';
import {Faq,JsonLd,breadcrumbLd} from '@guidejung/ui/seo';

export const metadata:Metadata={title:'기온별 옷차림 - 오늘 뭐 입지?',description:'오늘 기온에 맞는 옷차림 추천과 기온별 옷차림 표. 내 지역 최저·최고 기온으로 바로 확인하세요.',alternates:{canonical:SITE+'/wear'}};
const ROWS=[28,23,20,17,12,9,5,4].map((t,i,a)=>({range:i===0?'28° 이상':i===a.length-1?'4° 이하':`${t}~${a[i-1]-1}°`,...clothes(t)}));
export default function WearPage(){
  return <section className="section"><div className="eyebrow">WHAT TO WEAR</div><h1>오늘 뭐 입지? 기온별 옷차림</h1><WearToday/><Connect title="오늘 나들이 계획" items={genericFor('weather')}/><AdSlot/>
    <h2>기온별 옷차림 표</h2><table className="wear-table"><thead><tr><th>기온</th><th>추천 옷차림</th></tr></thead><tbody>{ROWS.map(r=><tr key={r.range}><td>{r.range}</td><td><b>{r.short}</b><br/><span className="muted small">{r.detail}</span></td></tr>)}</tbody></table>
    <p className="muted small">하루 최저·최고 기온의 평균을 기준으로 한 일반적인 안내입니다. 바람이 강하거나 비가 오면 한 단계 따뜻하게 입으세요.</p>
    <Faq title="기온별 옷차림 자주 묻는 질문" items={ROWS.map(r=>[`기온 ${r.range.replace('°','도')}에는 뭘 입어야 하나요?`,`추천 옷차림은 ${r.short}입니다(${r.detail}). 하루 최저·최고 기온의 평균 기준이며, 바람이 강하거나 비가 오면 한 단계 따뜻하게 입으세요.`] as [string,string])}/><JsonLd data={breadcrumbLd([['내근처 날씨',SITE_+'/'],['오늘 옷차림',SITE_+'/wear']])}/></section>;
}
