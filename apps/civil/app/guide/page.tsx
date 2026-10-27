import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {HowTo,KindCards} from '../_components/Guide';
import {nation,SITE} from '../../lib/data';
export const metadata:Metadata={title:'이용 안내 · 서류 떼는 곳 고르는 법',description:'무인민원발급기·주민센터·구청 민원실·여권 발급 기관·우체국 중 어디로 가야 하는지, 서류를 떼기 전에 알아 두면 좋은 것.',alternates:{canonical:'/guide'}};
export default function Guide(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 이용 안내</nav>
  <h1>서류 떼러 가기 전에</h1>
  <HowTo/>
  <KindCards counts={nation.kinds}/>
  <Faq items={[
    ['무인민원발급기 운영 시간은 어디서 보나요?','각 발급기 상세 페이지에 평일·주말·공휴일 운영 시간이 있습니다(행정안전부 공개 정보). 설치 장소 사정으로 바뀔 수 있으니 방문 전 확인하세요.'],
    ['주민센터 운영 시간은?','공공데이터에 주민센터 운영 시간은 없어 일반 기준(평일 09:00~18:00)으로 안내합니다. 야간·주말 운영은 해당 주민센터에 확인하세요.'],
    ['여권은 어디서 만드나요?','시·군·구청 여권민원실(여권사무대행기관)에서 신청·수령합니다. ‘여권 발급’ 메뉴에서 가까운 곳과 업무 시간을 확인하세요.'],
  ]}/>
  <JsonLd data={breadcrumbLd([['내근처 서류',SITE+'/'],['이용 안내',SITE+'/guide']])}/>
</div>;}
