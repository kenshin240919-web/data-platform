import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {AnimalGrid,NearAnimals} from '../_components/Animals';
import {Ad} from '../_components/Ad';
import {ANIMAL_SITE,animalsUpdated,lostAnimals,n,SITE} from '../../lib/data';

// 최근 30일 분실 신고 동물. 신고자 이름·전화는 받지 않고, 잃어버린 곳은 시군구·동까지만(집 주소가 드러나지 않게).
export const metadata:Metadata={title:`최근 실종 동물 ${n(lostAnimals.length)}마리 · 우리 동네 강아지·고양이 찾기`,description:`최근 30일 국가동물보호정보시스템에 분실 신고된 반려동물 ${n(lostAnimals.length)}마리. 내 주변 실종 동물을 보고, 보셨다면 보호소나 국가동물보호정보시스템에 알려 주세요. (${animalsUpdated()} 기준)`,alternates:{canonical:'/lost'}};
export default function Lost(){return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 실종 동물</nav>
  <h1>🔎 우리 동네 실종 동물</h1>
  <p className="pt-answer">최근 30일 분실 신고된 반려동물 <b>{n(lostAnimals.length)}마리</b>예요. 비슷한 아이를 보셨다면 가까운 동물보호센터나 <a href={ANIMAL_SITE} target="_blank" rel="noopener"><b>국가동물보호정보시스템</b></a>에 알려 주세요. <span className="muted">({animalsUpdated()} 기준)</span></p>
  <NearAnimals type="lost"/>
  <Ad/>
  {lostAnimals.length>0&&<section><h2>최근 신고</h2><AnimalGrid items={lostAnimals.slice(0,36)} lost/></section>}
  <section className="pt-guide"><h2>💬 우리 아이를 잃어버렸다면</h2><ol>
    <li><b>국가동물보호정보시스템에 분실 신고</b><span>사진·특징·잃어버린 곳을 올리면 이 목록에도 다음 날 보여요.</span></li>
    <li><b>가까운 보호소 공고를 매일 보세요</b><span>구조된 아이는 보호소에 공고돼요. <Link href="/adopt">내 주변 보호 중인 아이들</Link>에서 사진으로 찾아보세요.</span></li>
    <li><b>근처 동물병원에도 알리세요</b><span>다친 채 발견되면 동물병원으로 오는 경우가 있어요.</span></li>
  </ol><p className="muted small">개인정보 보호를 위해 신고자 이름·연락처와 자세한 주소는 보여 드리지 않아요.</p></section>
  <Faq items={[['최근 실종 신고된 동물은 몇 마리인가요?',`${animalsUpdated()} 기준 최근 30일 국가동물보호정보시스템에 분실 신고된 반려동물은 ${n(lostAnimals.length)}마리입니다.`],
    ['실종 동물을 보면 어떻게 하나요?','가까운 동물보호센터나 시·군·구청, 국가동물보호정보시스템에 알려 주세요. 다쳤다면 가까운 동물병원에 먼저 연락하세요.']]}/>
  <JsonLd data={breadcrumbLd([['내근처 동물병원',SITE+'/'],['실종 동물',`${SITE}/lost`]])}/>
</div>;}
