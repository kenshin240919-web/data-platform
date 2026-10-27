import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {PrintNear} from '../_components/PrintNear';
import {Ad} from '../_components/Ad';
import {SITE} from '../../lib/data';
export const metadata:Metadata={title:'내 주변 무인 프린트·프린트카페',description:'정부24에서 받은 서류나 문서를 바로 뽑을 수 있는 가까운 무인 프린트점·셀프 프린트·프린트카페를 실시간으로 찾아 드립니다.',alternates:{canonical:'/print'}};
export default function Print(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 무인 프린트</nav>
  <h1>📄 내 주변 무인 프린트·프린트카페</h1>
  <p className="cv-answer">정부24에서 온라인으로 뗀 서류, 휴대폰에 있는 문서를 <b>바로 뽑을 곳</b>을 찾아 드려요. 카카오맵·네이버 지역 검색을 실시간으로 함께 찾아요.</p>
  <PrintNear/>
  <Ad/>
  <section className="cv-guide"><h2>💡 이렇게 뽑아요</h2><ol>
    <li><b>정부24에서 서류 떼기</b><span>많은 서류를 정부24에서 온라인으로 뗄 수 있어요. 출력·저장 방법은 서류마다 달라 정부24 안내를 따르세요.</span></li>
    <li><b>무인 프린트 키오스크에서 휴대폰 연결</b><span>매장마다 QR·이메일·USB 등 방법이 달라요.</span></li>
    <li><b>안 되면 무인민원발급기</b><span><Link href="/kiosk">가까운 무인민원발급기</Link>에서 직접 떼는 게 빠를 수 있어요.</span></li>
  </ol></section>
  <Faq items={[['무인 프린트에서 정부24 서류를 뽑을 수 있나요?','서류마다 출력·저장 방법이 달라 정부24 안내를 따라야 합니다. 프린트점에서 안 되는 서류는 가까운 무인민원발급기에서 직접 떼세요.'],['무인 프린트 정보는 어디서 오나요?','카카오맵과 네이버 지역 검색 결과를 방문 때마다 실시간으로 보여 드리며 저장하지 않습니다. 운영 시간·가격은 매장에 확인하세요.']]}/>
  <JsonLd data={breadcrumbLd([['내근처 서류',SITE+'/'],['무인 프린트',SITE+'/print']])}/>
</div>;}
