import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {WarningDetail} from '../_components/Warnings';
import {SITE} from '../../lib/regions';

export const metadata:Metadata={title:'기상특보 현황 - 지금 발효 중인 특보와 예비특보',description:'호우·강풍·폭염·한파·대설 등 지금 발효 중인 기상특보와 예비특보를 기상청 발표 그대로 확인하세요.',alternates:{canonical:SITE+'/warnings'}};
export default function WarningsPage(){
  return <section className="section"><div className="eyebrow">WEATHER WARNINGS</div><h1>기상특보 현황</h1><WarningDetail/><AdSlot/>
    <div className="prose"><h2>주의보와 경보의 차이</h2><p>주의보는 기상 현상으로 피해가 생길 수 있을 때, 경보는 큰 피해가 예상될 때 기상청이 발표합니다. 예비특보는 앞으로 특보가 내려질 가능성이 있는 지역과 시간을 미리 알리는 정보입니다. 출처: 기상청 기상특보 통보문.</p></div></section>;
}
