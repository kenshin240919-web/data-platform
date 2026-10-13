import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {WeekendBoard} from '../_components/WeekendBoard';
import {label,sidos,SITE} from '../../lib/regions';

export const metadata:Metadata={title:'이번 주말 날씨 - 전국 맑은 곳 순위',description:'이번 주말 토요일·일요일 전국 날씨. 비 올 확률이 낮은 지역부터 보고 주말 나들이 갈 곳을 찾아보세요.',alternates:{canonical:SITE+'/weekend'}};
export default function WeekendPage(){
  const spots=sidos.map(s=>({code:s.capital.code,label:label(s.capital),sido:s.short,trip:s.capital.trip}));
  return <section className="section"><div className="eyebrow">WEEKEND</div><h1>이번 주말 전국 날씨</h1><WeekendBoard spots={spots}/><AdSlot/></section>;
}
