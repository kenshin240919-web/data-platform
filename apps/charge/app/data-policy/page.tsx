import type {Metadata} from 'next';
import {SITE} from '../../lib/regions';
export const metadata:Metadata={title:'데이터·출처 안내',alternates:{canonical:SITE+'/data-policy'}};
const paras=['충전소·충전기 정보와 상태는 한국환경공단 전기자동차 충전소 정보(공공데이터포털)를 사용합니다. 공공 및 민간 운영기관이 전송한 정보입니다.','상태는 운영기관이 마지막으로 전송한 시각 기준이며, 화면의 정보는 최대 약 30분 간격으로 갱신됩니다. 실제 현장 상태와 다를 수 있으니 이동 전 운영기관에 확인하세요.','충전 요금과 주차 요금은 운영기관마다 다릅니다. 무료 주차 표시는 원천 정보 기준입니다.'];
export default function Page(){return <article className="section prose"><div className="eyebrow">GUIDEJUNG CHARGE</div><h1>데이터·출처 안내</h1>{paras.map(p=><p key={p}>{p}</p>)}</article>;}
