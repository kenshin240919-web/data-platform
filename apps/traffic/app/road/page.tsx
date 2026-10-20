import {SITE as SITE_} from '../../lib/format';
import type {Metadata} from 'next';
import {Connect,genericFor} from '@guidejung/ui/network';
import {RouteCards} from '../_components/RouteCards';
import {SITE,roadName,routes,restsOn} from '../../lib/data';
import {Faq,JsonLd,breadcrumbLd} from '@guidejung/ui/seo';
export const metadata:Metadata={title:'고속도로별 실시간 교통상황',description:`전국 고속도로 ${routes.length}개 노선의 실시간 정체·서행 구간을 노선별로 확인하세요.`,alternates:{canonical:SITE+'/road'}};
export default function RoadIndex(){
  return <section className="section"><div className="eyebrow">ALL HIGHWAYS</div><h1>고속도로별 실시간 교통상황</h1>
    <p className="muted">노선을 누르면 IC 순서대로 구간별 속도와 정체를 볼 수 있어요.</p><RouteCards routes={routes}/><Faq items={[['전국 고속도로는 몇 개 노선인가요?',`실시간 소통 정보가 있는 고속도로는 ${routes.length}개 노선입니다.`],
      ['구간이 가장 많은 고속도로는 어디인가요?',routes.slice(0,3).map(r=>`${roadName(r)}(${r.start}~${r.end}, ${r.E.length+r.S.length}개 구간)`).join(', ')+' 순입니다.'],
      ['휴게소가 가장 많은 고속도로는 어디인가요?',[...routes].sort((a,b)=>restsOn(b.no).length-restsOn(a.no).length).slice(0,3).map(r=>`${roadName(r)}(${restsOn(r.no).length}곳)`).join(', ')+' 순입니다.']]}/><Connect items={genericFor('traffic')}/><JsonLd data={breadcrumbLd([['내근처 고속도로',SITE_+'/'],['고속도로 노선',SITE_+'/road']])}/></section>;
}
