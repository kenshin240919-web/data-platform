import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {BoxOffice} from '../_components/Live';
import {Ad} from '../_components/Ad';
import {SITE} from '../../lib/data';
export const metadata:Metadata={title:'어제 박스오피스 순위 · 일별 관객 수',description:'영화진흥위원회 통합전산망 기준 어제 하루 관객 수 순위(박스오피스)와 누적 관객 수. 보고 싶은 영화는 내 주변 극장의 오늘 남은 상영에서 찾아보세요.',alternates:{canonical:'/boxoffice'}};
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
  ]}/>
  <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],['박스오피스',SITE+'/boxoffice']])}/>
</div>;}
