import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Gs25Near} from '../_components/Gs25Near';
import {GsLinks} from '../_components/GsLinks';
import {Ad} from '../_components/Ad';
import {SITE} from '../../lib/data';
export const metadata:Metadata={title:'마감할인 하는 편의점 · 내 주변 GS25 마감할인',description:'내 위치에서 1.5km 안 마감할인 서비스를 등록한 GS25를 가까운 순으로. GS25 앱에 매장이 등록한 서비스 정보를 방문할 때 바로 확인해 보여 드려요.',alternates:{canonical:'/closing-sale'}};
const PICKS=[{key:'sale',label:'마감할인',props:['마감할인']}];
export default function ClosingSale(){
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 마감할인 하는 편의점</nav>
    <h1>🏷️ 내 주변 마감할인 하는 편의점</h1>
    <p className="muted">GS25 앱에 ‘마감할인’ 서비스를 등록한 매장을 내 위치에서 가까운 순으로 보여 드려요.</p>
    <Gs25Near title="마감할인 하는 GS25" picks={PICKS} verb="하는"
      note={<>GS25 앱에 매장이 등록한 서비스 기준이에요(비공식 안내). 지금 어떤 상품이 얼마나 할인되는지는 이 페이지에서 알 수 없어요. GS25 앱에서 확인하거나 가기 전에 📞 매장에 물어보세요.</>}/>
    <Ad/>
    <section className="cv-guide"><h2>🏷️ 알고 가면 좋은 것</h2><ol>
      <li><b>할인 상품은 그때그때 달라요</b><span>마감할인은 매장에 남은 상품에 따라 바뀌어서, 등록된 매장이라도 지금 할인 상품이 없을 수 있어요.</span></li>
      <li><b>상품·할인율은 GS25 앱에서</b><span>이 페이지는 마감할인을 등록한 매장 위치만 알려 드려요. 상품 목록·가격은 저장하지도 보여 드리지도 않아요.</span></li>
      <li><b>가까운 곳 두세 곳을 함께 보세요</b><span>목록은 가까운 순이에요. 퇴근길 동선에 있는 매장을 골라 보세요.</span></li>
    </ol></section>
    <GsLinks here="/closing-sale"/>
    <Faq items={[
      ['편의점 마감할인은 어디서 하나요?','이 페이지는 GS25 앱에 ‘마감할인’ 서비스를 등록한 매장을 내 위치에서 1.5km 안, 가까운 순으로 보여 드립니다.'],
      ['어떤 상품이 할인되나요?','매장에 남은 상품에 따라 그때그때 달라 이 페이지에서는 알 수 없습니다. GS25 앱에서 확인하세요.'],
      ['목록에 있으면 지금 할인 상품이 있나요?','아니요. 매장이 등록한 서비스 정보라서 지금 할인 상품이 남아 있는지는 알 수 없어요.'],
      ['다른 편의점 마감할인은 왜 안 보이나요?','다른 편의점은 매장별 서비스 정보를 받을 수 없어서 GS25만 보여 드립니다.'],
    ]}/>
    <p className="muted small">GS25 앱에 공개된 매장 정보를 방문할 때마다 바로 확인합니다(GS25 본사와 관계없는 비공식 안내, 저장하지 않음).</p>
    <JsonLd data={breadcrumbLd([['내근처 편의점',SITE+'/'],['마감할인 하는 편의점',SITE+'/closing-sale']])}/>
  </div>;
}
