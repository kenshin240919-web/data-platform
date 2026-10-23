import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Checklist,RepairTypes} from '../_components/Guide';
import {nation,SITE} from '../../lib/data';
export const metadata:Metadata={title:'정비 맡기기 전 확인할 것 · 1급·2급·3급 정비소 차이',description:'자동차 정비소 종류(종합·소형·전문·원동기 정비)의 차이, 견적서 받기·부품 확인 등 정비 맡기기 전 체크리스트, 직영 서비스센터와 동네 정비소 고르는 법.',alternates:{canonical:'/guide'}};
export default function Guide(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 맡기기 전 확인</nav>
  <h1>정비 맡기기 전에 꼭 확인할 것</h1>
  <p className="sv-answer">가장 많이 찾는 질문은 <b>“어디에 맡겨야 덜 손해 볼까?”</b>예요. 정비소 종류를 알고, 견적서를 받고, 두세 곳을 비교하면 대부분의 분쟁을 피할 수 있어요.</p>
  <RepairTypes counts={nation.subs}/>
  <Checklist/>
  <section className="sv-guide"><h2>🔀 제조사 서비스센터 vs 동네 정비소</h2><dl className="sv-types">
    <div><dt>제조사 직영 서비스센터·협력점</dt><dd>보증 기간 안의 수리, 리콜·무상 수리는 제조사 쪽에 먼저 문의하세요. 협력점 위치는 제조사 누리집의 ‘서비스센터 찾기’에서 확인할 수 있어요.</dd></div>
    <div><dt>동네 정비소(종합·소형·전문 정비)</dt><dd>보증이 끝난 차의 일반 정비·소모품 교체는 동네 정비소에서도 할 수 있어요. 큰 사고 수리는 종합정비업, 부분 수리는 전문정비업인지 확인하세요.</dd></div>
  </dl></section>
  <section className="sv-guide"><h2>🛢️ 소모품은 언제 바꾸나요?</h2><p>엔진오일·필터·브레이크 같은 소모품 교체 주기는 차종과 운전 습관(짧은 거리 위주·잦은 정체·견인 등)에 따라 달라요. <b>내 차 취급설명서의 정비 주기 표</b>를 기준으로 하세요. 이 사이트는 숫자를 단정하지 않아요.</p></section>
  <Faq items={[
    ['정비소에서 견적서를 꼭 받아야 하나요?','정비업자는 점검·정비 견적서를 발급할 의무가 있습니다. 금액·작업 내용·부품·수리 기간을 적은 견적서를 받아 두면 분쟁을 줄일 수 있습니다.'],
    ['수리비가 견적보다 많이 나왔어요.','명세서와 견적서를 보관하고 한국소비자원 소비자상담센터(1372)에 상담하세요. 소비자원 발표에서는 처음 안내한 금액보다 1.6배 많이 청구한 사례도 있었습니다.'],
  ]}/>
  <JsonLd data={breadcrumbLd([['내근처 서비스센터',SITE+'/'],['맡기기 전 확인',SITE+'/guide']])}/>
</div>;}
