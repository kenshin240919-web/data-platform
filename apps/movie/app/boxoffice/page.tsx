import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {BoxOffice} from '../_components/Live';
import {Ad} from '../_components/Ad';
import {SITE} from '../../lib/data';
export const metadata:Metadata={title:'박스오피스 순위 · 어제 영화 관객 수 · 누적 관객',description:'영화진흥위원회 통합전산망 기준 어제 하루 관객 수 순위(박스오피스)와 누적 관객 수. 보고 싶은 영화는 내 주변 극장의 오늘 남은 상영에서 찾아보세요.',alternates:{canonical:'/boxoffice'}};
export default function Page(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 박스오피스</nav>
  <h1>🏆 어제 박스오피스</h1>
  <p className="muted">어제 하루 관객 수 순위예요. 보고 싶은 영화가 있으면 <Link href="/">내 주변 극장</Link>에서 오늘 남은 상영을 찾아보세요.</p>
  <BoxOffice limit={10}/>
  <Ad/>
  <section className="mv-guide"><h2>박스오피스 읽는 법</h2><ol>
    <li><b>순위는 어제 하루 관객 수</b><span>영화관입장권 통합전산망에 집계된 전날 관객 수 기준이에요.</span></li>
    <li><b>▲▼는 그 전날과 비교한 순위 변화</b><span>NEW는 이날 처음 순위에 든 영화예요.</span></li>
    <li><b>누적 관객 수</b><span>개봉한 날부터 어제까지 모인 관객 수예요.</span></li>
  </ol></section>
  <Faq items={[
    ['박스오피스는 어디 자료인가요?','영화진흥위원회 영화관입장권 통합전산망 오픈 API의 일별 박스오피스입니다. 방문할 때마다 바로 확인해 보여 드리고 저장하지 않습니다.'],
    ['오늘 박스오피스는 왜 없나요?','통합전산망 일별 박스오피스는 하루가 끝난 뒤 집계돼 어제 순위까지 볼 수 있습니다.'],
    ['박스오피스 순위는 무엇으로 정하나요?','하루 동안 영화관에서 표를 끊고 본 관객 수가 많은 순서입니다. 누적 관객 수는 개봉일부터 어제까지 모두 더한 수입니다.'],
    ['주말 박스오피스는 어떻게 보나요?','이 페이지는 하루 단위 순위만 보여 드립니다. 토·일요일 순위는 월요일에 일요일 순위까지 확인할 수 있습니다.'],
    ['보고 싶은 영화를 어디서 볼 수 있나요?','첫 화면의 내 주변 영화관에서 극장마다 오늘 남은 상영 시간과 남은 좌석을 확인할 수 있습니다. CGV·롯데시네마·메가박스와 작은 영화관이 함께 나옵니다.'],
  ]}/>
  <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],['박스오피스',SITE+'/boxoffice']])}/>
</div>;}
