import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Gs25Near} from '../_components/Gs25Near';
import {GsLinks} from '../_components/GsLinks';
import {Ad} from '../_components/Ad';
import {SITE} from '../../lib/data';
export const metadata:Metadata={title:'현금 출금 되는 편의점 · 내 주변 GS25 ATM',description:'내 위치에서 1.5km 안 현금 출금·입금이 되는 GS25(ATM)를 가까운 순으로. GS25 앱에 매장이 등록한 서비스 정보를 방문할 때 바로 확인해 보여 드려요.',alternates:{canonical:'/atm'}};
const PICKS=[{key:'out',label:'현금 출금',props:['현금출금','현금 입/출금','스마트ATM']},{key:'in',label:'입금도',props:['현금 입/출금']},{key:'smart',label:'스마트ATM',props:['스마트ATM']}];
export default function Atm(){
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 현금 출금 되는 편의점</nav>
    <h1>🏧 내 주변 현금 출금 되는 편의점</h1>
    <p className="muted">GS25 앱에 ‘현금출금’·‘현금 입/출금’·‘스마트ATM’을 등록한 매장을 내 위치에서 가까운 순으로 보여 드려요. 밤늦게 은행이 닫았을 때 가까운 ATM을 찾을 때 쓰세요.</p>
    <Gs25Near title="현금 출금 되는 GS25" picks={PICKS} verb="되는"
      note={<>GS25 앱에 매장이 등록한 서비스 기준이에요(비공식 안내). 수수료·이용 시간·쓸 수 있는 은행과 카드는 기기 화면에서 확인하세요. 기기 점검 중일 수 있으니 급하면 가기 전에 📞 매장에 물어보세요.</>}/>
    <Ad/>
    <section className="cv-guide"><h2>🏧 헛걸음 안 하려면</h2><ol>
      <li><b>입금이 필요하면 ‘입금도’ 버튼으로</b><span>출금만 되는 기기가 많아요. ‘현금 입/출금’을 등록한 매장만 따로 볼 수 있어요.</span></li>
      <li><b>수수료는 기기 화면에서 확인하세요</b><span>은행·시간대·기기마다 달라서 이 페이지에는 숫자를 적지 않았어요.</span></li>
      <li><b>카드나 통장, 휴대폰을 챙기세요</b><span>기기마다 쓸 수 있는 방법이 달라요. 스마트ATM은 기능이 더 많은 기기로 등록된 곳이에요.</span></li>
    </ol></section>
    <GsLinks here="/atm"/>
    <Faq items={[
      ['밤에 현금 뽑을 수 있는 편의점은 어디인가요?','이 페이지는 GS25 앱에 ‘현금출금’·‘현금 입/출금’·‘스마트ATM’ 서비스를 등록한 매장을 내 위치에서 1.5km 안, 가까운 순으로 보여 드립니다. 이용 시간은 기기마다 다를 수 있어요.'],
      ['편의점 ATM에서 입금도 되나요?','일부 기기만 됩니다. 위의 ‘입금도’ 버튼을 누르면 ‘현금 입/출금’을 등록한 GS25만 보여 드립니다.'],
      ['편의점 ATM 수수료는 얼마인가요?','은행·시간대·기기마다 달라 여기서는 안내하지 않습니다. 출금 전에 기기 화면에 나오는 수수료를 확인하세요.'],
      ['CU·세븐일레븐 ATM은 왜 안 보이나요?','다른 편의점은 매장별 서비스 정보를 받을 수 없어서 GS25만 보여 드립니다. 다른 편의점에 ATM이 없다는 뜻은 아닙니다.'],
    ]}/>
    <p className="muted small">GS25 앱에 공개된 매장 정보를 방문할 때마다 바로 확인합니다(GS25 본사와 관계없는 비공식 안내, 저장하지 않음).</p>
    <JsonLd data={breadcrumbLd([['내근처 편의점',SITE+'/'],['현금 출금 되는 편의점',SITE+'/atm']])}/>
  </div>;
}
