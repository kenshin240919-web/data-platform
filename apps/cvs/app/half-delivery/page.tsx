import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Gs25Near} from '../_components/Gs25Near';
import {GsLinks} from '../_components/GsLinks';
import {Ad} from '../_components/Ad';
import {SITE} from '../../lib/data';
export const metadata:Metadata={title:'반값택배 되는 편의점 · 내 주변 GS25 반값택배 접수·픽업',description:'내 위치에서 1.5km 안 반값택배를 보내거나 받을 수 있는 GS25를 가까운 순으로. GS25 앱에 매장이 등록한 서비스 정보를 방문할 때 바로 확인해 보여 드려요.',alternates:{canonical:'/half-delivery'}};
const PICKS=[{key:'send',label:'반값택배 보내기',props:['반값택배접수']},{key:'get',label:'반값택배 받기',props:['반값택배픽업']},{key:'parcel',label:'일반 택배 보내기',props:['국내택배접수']}];
export default function HalfDelivery(){
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 반값택배 되는 편의점</nav>
    <h1>📦 내 주변 반값택배 되는 편의점</h1>
    <p className="muted">GS25 앱에 ‘반값택배 접수’·‘반값택배 픽업’·‘국내택배 접수’를 등록한 매장을 내 위치에서 가까운 순으로 보여 드려요.</p>
    <Gs25Near title="반값택배 되는 GS25" picks={PICKS} verb="되는"
      note={<>GS25 앱에 매장이 등록한 서비스 기준이에요(비공식 안내). 요금·크기·무게 기준과 보관 기간은 GS25 앱이나 공식 누리집에서 확인하고, 급하면 가기 전에 📞 매장에 물어보세요. CU 등 다른 편의점 택배는 이 정보를 받을 수 없어 보이지 않을 뿐이에요.</>}/>
    <Ad/>
    <section className="cv-guide"><h2>📦 보내기 전에</h2><ol>
      <li><b>받는 사람이 갈 수 있는 매장인지 확인하세요</b><span>반값택배는 받는 사람도 편의점에서 찾아가는 방식이에요. ‘반값택배 받기’ 버튼으로 받는 사람 동네의 매장을 미리 볼 수 있어요.</span></li>
      <li><b>요금·크기·무게 기준은 공식 안내로</b><span>기준이 바뀔 수 있어 이 페이지에는 숫자를 적지 않았어요. GS25 앱이나 공식 누리집에서 확인하세요.</span></li>
      <li><b>집으로 받아야 하면 ‘일반 택배 보내기’</b><span>매장이 국내택배 접수를 등록했는지 버튼으로 따로 볼 수 있어요.</span></li>
    </ol></section>
    <GsLinks here="/half-delivery"/>
    <Faq items={[
      ['반값택배는 어느 편의점에서 보내나요?','이 페이지는 GS25 앱에 ‘반값택배 접수’ 서비스를 등록한 매장을 내 위치에서 1.5km 안, 가까운 순으로 보여 드립니다.'],
      ['반값택배를 받을 매장은 어떻게 찾나요?','위의 ‘반값택배 받기’ 버튼을 누르면 GS25 앱에 ‘반값택배 픽업’을 등록한 매장만 보여 드립니다.'],
      ['반값택배 요금은 얼마인가요?','요금·크기·무게 기준은 바뀔 수 있어 여기서는 안내하지 않습니다. GS25 앱이나 공식 누리집에서 확인하세요.'],
      ['목록에 없는 매장은 반값택배가 안 되나요?','GS25 앱에 등록된 정보만 보여 드려서 빠진 매장이 있을 수 있어요. 가까운 매장에 전화로 확인하세요.'],
    ]}/>
    <p className="muted small">GS25 앱에 공개된 매장 정보를 방문할 때마다 바로 확인합니다(GS25 본사와 관계없는 비공식 안내, 저장하지 않음).</p>
    <JsonLd data={breadcrumbLd([['내근처 편의점',SITE+'/'],['반값택배 되는 편의점',SITE+'/half-delivery']])}/>
  </div>;
}
