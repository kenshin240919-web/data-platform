import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {HoursNote,KindCards,KindGuide,SickGuide} from '../_components/Guide';
import {nation,SITE} from '../../lib/data';
export const metadata:Metadata={title:'우리 아이 아플 때 · 동물병원 가기 전에',description:'반려동물이 아플 때 순서(전화로 진료 확인·안전하게 이동·증상 기록), 24시 동물병원 찾기, 동물약국과 동물병원의 차이를 안내합니다.',alternates:{canonical:'/guide'}};
export default function Guide(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 아플 때</nav>
  <h1>우리 아이 아플 때 알아 두면 좋은 것</h1>
  <p className="pt-answer">이 사이트의 모든 곳은 <b>시·군·구에 신고·등록된 곳</b>이에요. 행정안전부 지방행정 인허가데이터에서 영업 중인 곳만 매일 골라 보여 드려요. 밤·주말에는 <Link href="/24h"><b>24시 동물병원</b></Link>부터 확인하세요.</p>
  <SickGuide/>
  <HoursNote/>
  <KindGuide/>
  <KindCards counts={nation.kinds} h24={nation.h24}/>
  <Faq items={[
    ['동물병원과 동물약국은 무엇이 다른가요?','동물병원은 수의사가 진료하는 곳이고, 동물약국은 동물용 의약품을 파는 약국입니다. 진단과 처방은 동물병원에서 받으세요.'],
    ['사람 약을 반려동물에게 먹여도 되나요?','사람 약 중에는 반려동물에게 위험한 것이 있습니다. 먹이기 전에 수의사와 상의하세요.'],
    ['24시 동물병원은 어떻게 고르나요?','이 사이트의 24시 목록은 병원 이름에 ‘24’가 들어간 곳입니다. 가장 가까운 곳에 먼저 전화해 지금 진료가 되는지 확인하세요.'],
  ]}/>
  <JsonLd data={breadcrumbLd([['내근처 동물병원',SITE+'/'],['아플 때',SITE+'/guide']])}/>
</div>;}
