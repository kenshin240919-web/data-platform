import type {Metadata} from 'next';
import {SITE} from '../../lib/regions';
export const metadata:Metadata={title:'개인정보 안내',alternates:{canonical:SITE+'/privacy'}};
const paras=['회원가입 없이 이용할 수 있습니다. 내 위치 날씨 버튼을 누르고 위치 권한을 허용한 경우에만 브라우저 안에서 가장 가까운 지역을 고르는 데 위치를 사용하며, 위치를 서버로 보내거나 저장하지 않습니다.','최근 본 지역은 이용자의 브라우저(localStorage)에만 저장되며 언제든 브라우저 설정에서 지울 수 있습니다.','이 사이트는 Google AdSense 광고를 게재합니다. Google 등 제3자 광고 사업자는 쿠키를 사용해 이 사이트와 다른 사이트 방문 기록을 바탕으로 광고를 제공할 수 있습니다. 맞춤 광고는 Google 광고 설정(adssettings.google.com)에서 해제할 수 있습니다.','Analytics 추적 코드는 넣지 않았습니다.'];
export default function Page(){return <article className="section prose"><div className="eyebrow">GUIDEJUNG WEATHER</div><h1>개인정보 안내</h1>{paras.map(p=><p key={p}>{p}</p>)}</article>;}
