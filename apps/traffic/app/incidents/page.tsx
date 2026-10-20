import {SITE as SITE_} from '../../lib/format';
import {JsonLd,breadcrumbLd} from '@guidejung/ui/seo';
import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {Connect,GENERIC} from '@guidejung/ui/network';
import {IncidentList} from '../_components/IncidentBar';
import {SITE} from '../../lib/format';
export const metadata:Metadata={title:'고속도로 사고·공사 실시간',description:'지금 진행 중인 고속도로 사고, 공사, 차로 통제 정보를 실시간으로 확인하세요.',alternates:{canonical:SITE+'/incidents'}};
export default function Page(){return <section className="section"><div className="eyebrow">INCIDENTS</div><h1>고속도로 사고·공사 실시간</h1><IncidentList/><Connect title="사고·통제와 함께 확인" items={[{icon:'⚠️',title:'지금 기상특보',desc:'비·눈·강풍 특보 지역',href:'https://weather.guidejung.com/warnings'},GENERIC.weather,GENERIC.charge]}/><AdSlot/><JsonLd data={breadcrumbLd([['내근처 고속도로',SITE_+'/'],['사고·공사',SITE_+'/incidents']])}/></section>;}
