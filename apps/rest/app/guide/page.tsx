import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {KindCards,KindGuide,PriceNote} from '../_components/Guide';
import {nation,SITE} from '../../lib/data';
export const metadata:Metadata={title:'이용 안내 · 신고된 업소 고르는 법',description:'찜질방·목욕탕(목욕장업), 1인 목욕·세신샵, 안마원·안마시술소(의료법 안마사), 피부관리실(피부미용업)의 차이와 신고된 업소를 확인하는 방법.',alternates:{canonical:'/guide'}};
export default function Guide(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 이용 안내</nav>
  <h1>쉬러 가기 전에 알아 두면 좋은 것</h1>
  <p className="rs-answer">이 사이트의 모든 업소는 <b>시·군·구에 영업 신고가 된 곳</b>이에요. 행정안전부 지방행정 인허가데이터에서 영업 중인 곳만 매일 골라 보여 드려요.</p>
  <KindGuide/>
  <section className="rs-guide"><h2>✅ 신고된 업소인지 확인하려면</h2><ol>
    <li><b>이 사이트에서 이름을 찾아보세요</b><span>신고일·주소가 함께 보여요. 목록에 없으면 신고되지 않았거나 다른 업종으로 신고된 곳일 수 있어요.</span></li>
    <li><b>피부관리실은 신고증·면허증을 보세요</b><span>미용업은 영업소 안에 신고증과 면허증 원본을 걸어 두어야 해요.</span></li>
    <li><b>의심되면 시·군·구청에 문의하세요</b><span>위생 관련 신고·민원은 관할 시·군·구청 위생과가 맡아요.</span></li>
  </ol></section>
  <PriceNote/>
  <KindCards counts={nation.kinds}/>
  <Faq items={[
    ['안마원과 안마시술소는 무엇이 다른가요?','둘 다 의료법에 따라 안마사가 개설해 신고하는 곳으로, 시설 규모와 기준이 다릅니다. 이 사이트는 신고된 업태 이름(안마원·안마시술소)을 그대로 보여 드립니다.'],
    ['1인 목욕탕은 어떤 업종인가요?','대부분 공중위생관리법의 목욕장업(‘목욕장업 기타’)으로 신고돼 있고, 세신만 하는 곳은 미용업으로 신고된 곳도 있습니다.'],
    ['피부관리실에서 레이저 시술을 받아도 되나요?','피부미용업은 의료기기나 의약품을 쓰는 시술을 할 수 없습니다. 레이저·주사 같은 시술은 의료기관에서 받으세요.'],
  ]}/>
  <JsonLd data={breadcrumbLd([['내근처 휴식',SITE+'/'],['이용 안내',SITE+'/guide']])}/>
</div>;}
