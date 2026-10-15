import type {Metadata} from 'next';
import {Connect,GENERIC,TRAFFIC_URL} from '@guidejung/ui/network';
import {AdSlot} from '@guidejung/ui/ads';
import {WeekendBoard} from '../_components/WeekendBoard';
import {label,sidos,SITE} from '../../lib/regions';

export const metadata:Metadata={title:'이번 주말 날씨 - 전국 맑은 곳 순위',description:'이번 주말 토요일·일요일 전국 날씨. 비 올 확률이 낮은 지역부터 보고 주말 나들이 갈 곳을 찾아보세요.',alternates:{canonical:SITE+'/weekend'}};
export default function WeekendPage(){
  const spots=sidos.map(s=>({code:s.capital.code,label:label(s.capital),sido:s.short,trip:s.capital.trip}));
  return <section className="section"><div className="eyebrow">WEEKEND</div><h1>이번 주말 전국 날씨</h1><WeekendBoard spots={spots}/><Connect title="주말 나들이 준비" items={[GENERIC.trip,{icon:'🛣️',title:'주말 고속도로 정체',desc:'떠나기 전 막히는 구간·CCTV',href:TRAFFIC_URL},GENERIC.charge]}/><AdSlot/></section>;
}
