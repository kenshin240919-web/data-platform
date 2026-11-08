import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {MedicineGuide,NightSteps} from '../_components/Guide';
import {Ad} from '../_components/Ad';
import {n,PHARMACY,SITE,status,updated} from '../../lib/data';
export const metadata:Metadata={title:'편의점 상비약 안내 · 어디서 살 수 있나',description:'편의점에서 파는 안전상비의약품이 무엇인지, 어떤 매장에서 살 수 있는지(판매자 등록·24시간 연중 무휴), 밤에 아플 때 순서를 약사법 원문으로 안내합니다.',alternates:{canonical:'/medicine'}};
export default function Medicine(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 상비약 안내</nav>
  <h1>편의점 상비약, 어디서 살 수 있나요?</h1>
  <p className="cv-answer">편의점 상비약은 <b>안전상비의약품 판매자로 등록한 매장</b>에서만 팔 수 있어요. {updated()} 기준 전국 <b>{n(status.count)}곳</b>이 등록돼 있어요. <Link href="/">내 주변 찾기 →</Link></p>
  <MedicineGuide/>
  <Ad/>
  <NightSteps/>
  <section className="cv-guide"><h2>✅ 등록된 매장인지 확인하려면</h2><ol>
    <li><b>이 사이트에서 매장 이름을 찾아보세요</b><span>등록일·주소가 함께 보여요. 목록에 없으면 등록되지 않은 매장일 수 있어요. <Link href="/search">매장 찾기 →</Link></span></li>
    <li><b>궁금한 점은 관할 시·군·구청에</b><span>판매자 등록은 시장·군수·구청장에게 하므로, 등록 여부는 관할 시·군·구청에서 확인할 수 있어요.</span></li>
  </ol></section>
  <Faq items={[
    ['안전상비의약품은 몇 가지인가요?','약사법 제44조의2에 따라 보건복지부장관이 20개 품목 이내에서 정해 고시합니다. 실제 고시 품목은 보건복지부 고시를 확인하세요.'],
    ['편의점 상비약은 24시간 살 수 있나요?','판매자로 등록하려면 24시간 연중 무휴 점포를 갖춰야 합니다. 실제 영업 시간은 바뀔 수 있으니 급하면 전화로 확인하세요.'],
    ['약국과 무엇이 다른가요?','약국에서는 약사에게 상담을 받고 더 많은 일반의약품을 살 수 있습니다. 편의점은 등록된 상비약만 팔 수 있습니다.'],
  ]}/>
  <p className="muted small">근거: 약사법 제44조의2(안전상비의약품 판매자의 등록)·제44조의3(판매자의 교육) — 국가법령정보센터에서 2026-11-08 확인. <a href={PHARMACY}>내근처 약국</a></p>
  <JsonLd data={breadcrumbLd([['내근처 편의점',SITE+'/'],['상비약 안내',SITE+'/medicine']])}/>
</div>;}
