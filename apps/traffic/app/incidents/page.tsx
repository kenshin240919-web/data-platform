import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {IncidentList} from '../_components/IncidentBar';
import {SITE} from '../../lib/format';
export const metadata:Metadata={title:'고속도로 사고·공사 실시간',description:'지금 진행 중인 고속도로 사고, 공사, 차로 통제 정보를 실시간으로 확인하세요.',alternates:{canonical:SITE+'/incidents'}};
export default function Page(){return <section className="section"><div className="eyebrow">INCIDENTS</div><h1>고속도로 사고·공사 실시간</h1><IncidentList/><AdSlot/></section>;}
