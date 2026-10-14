import type {Metadata} from 'next';
import {RouteCards} from '../_components/RouteCards';
import {SITE,routes} from '../../lib/data';
export const metadata:Metadata={title:'고속도로별 실시간 교통상황',description:`전국 고속도로 ${routes.length}개 노선의 실시간 정체·서행 구간을 노선별로 확인하세요.`,alternates:{canonical:SITE+'/road'}};
export default function RoadIndex(){
  return <section className="section"><div className="eyebrow">ALL HIGHWAYS</div><h1>고속도로별 실시간 교통상황</h1>
    <p className="muted">노선을 누르면 IC 순서대로 구간별 속도와 정체를 볼 수 있어요.</p><RouteCards routes={routes}/></section>;
}
