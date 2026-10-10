import type {Metadata} from 'next';
import {SITE} from '../../lib/regions';
export const metadata:Metadata={title:'데이터·출처 안내',alternates:{canonical:SITE+'/data-policy'}};
const paras=['날씨는 기상청 단기예보(초단기실황·단기예보), 중기예보, 생활기상지수 공식 자료를 사용합니다. 미세먼지는 한국환경공단 에어코리아 측정소 실시간 자료를 사용합니다.','시군구 날씨는 지역 중심 좌표가 속한 기상청 5km 격자 기준입니다. 4일 이후 예보는 기상청 중기예보 구역과 대표 지점 기온 기준입니다. 미세먼지는 지역 중심에서 가장 가까운 측정소 값이며 측정소 사정으로 비어 있으면 다음으로 가까운 측정소 값을 보여 드립니다.','예보는 발표 시각마다 갱신되며 화면에 발표 시각을 함께 표시합니다. 기상청 응답이 늦을 때는 마지막으로 받은 예보를 그 사실과 함께 보여 드립니다. 일출·일몰은 지역 중심 좌표로 계산한 값입니다.','시군구 중심 좌표는 공개 행정동 경계 자료로 계산했습니다. 출처: 기상청, 한국환경공단 에어코리아(공공데이터포털).'];
export default function Page(){return <article className="section prose"><div className="eyebrow">GUIDEJUNG WEATHER</div><h1>데이터·출처 안내</h1>{paras.map(p=><p key={p}>{p}</p>)}</article>;}
