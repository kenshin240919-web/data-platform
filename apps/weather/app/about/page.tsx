import type {Metadata} from 'next';
import {SITE} from '../../lib/regions';
export const metadata:Metadata={title:'서비스 소개',alternates:{canonical:SITE+'/about'}};
const paras=['날씨정보는 전국 시군구의 지금 날씨, 시간별·10일 예보, 미세먼지를 한 화면에서 확인하는 무료 날씨 서비스입니다.','오늘 옷차림, 우산 필요 여부, 미세먼지 같은 생활 정보를 먼저 보여 드리고, 같은 운영자의 여행정보 서비스와 연결해 날씨 좋은 날 가볼 만한 곳도 함께 안내합니다.'];
export default function Page(){return <article className="section prose"><div className="eyebrow">GUIDEJUNG WEATHER</div><h1>서비스 소개</h1>{paras.map(p=><p key={p}>{p}</p>)}</article>;}
