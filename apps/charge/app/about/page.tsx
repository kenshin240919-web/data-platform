import type {Metadata} from 'next';
import {SITE} from '../../lib/regions';
export const metadata:Metadata={title:'서비스 소개',alternates:{canonical:SITE+'/about'}};
const paras=['충전소정보는 전국 전기차 충전소의 위치와 충전기별 실시간 상태를 확인하는 무료 서비스입니다.','내 주변에서 지금 비어 있는 급속 충전기를 먼저 보여 드리고, 충전하는 동안 갈 만한 여행지와 지역 날씨도 함께 안내합니다.'];
export default function Page(){return <article className="section prose"><div className="eyebrow">GUIDEJUNG CHARGE</div><h1>서비스 소개</h1>{paras.map(p=><p key={p}>{p}</p>)}</article>;}
