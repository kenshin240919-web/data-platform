import type {Metadata} from 'next';
import {SITE} from '../../lib/format';
export const metadata:Metadata={title:'데이터·출처 안내',alternates:{canonical:SITE+'/data-policy'}};
const paras=['고속도로 구간 소통, 돌발(사고·공사) 정보, 휴게소·음식·편의시설·주유소 가격은 한국도로공사 고속도로 공공데이터 포털(data.ex.co.kr) Open API를 사용합니다.','구간 소통은 약 5분, 사고·공사는 약 10분 간격으로 갱신합니다. 휴게소 정보와 기름값은 하루 한 번 갱신합니다. 실제 도로 상황·가격과 다를 수 있으니 운전 중에는 도로 전광판과 안내를 우선하세요.','정체 등급(원활·서행·정체)은 한국도로공사가 제공하는 구간 등급을 그대로 사용합니다. 구간에 여러 검지기가 있으면 평균 속도와 가장 많이 나온 등급을 보여 드립니다.'];
export default function Page(){return <article className="section prose"><div className="eyebrow">GUIDEJUNG TRAFFIC</div><h1>데이터·출처 안내</h1>{paras.map(p=><p key={p}>{p}</p>)}</article>;}
