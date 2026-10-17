import type {Metadata} from 'next';
import {SITE} from '../../lib/format';
export const metadata:Metadata={title:'서비스 소개',alternates:{canonical:SITE+'/about'}};
const paras=['내근처 고속도로는 전국 고속도로의 실시간 정체 구간, 휴게소 대표 음식과 기름값, 사고·공사 정보를 한곳에서 확인하는 무료 서비스입니다.','지금 가장 막히는 구간을 먼저 보여 드리고, 노선을 누르면 IC 순서대로 구간별 속도를 볼 수 있습니다. 휴게소에서는 주변 충전소, 지역 날씨, 가볼만한곳으로 이어집니다.'];
export default function Page(){return <article className="section prose"><div className="eyebrow">GUIDEJUNG TRAFFIC</div><h1>서비스 소개</h1>{paras.map(p=><p key={p}>{p}</p>)}</article>;}
