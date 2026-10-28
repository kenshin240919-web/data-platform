import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Find} from '../_components/Live';
import {CODE_LABEL,HOUSE,items,LIFE,n,SITE} from '../../lib/data';
import {regionsLite} from '../../lib/regions-lite';
export const metadata:Metadata={title:'나에게 맞는 지원금·혜택 찾기',description:'사는 시군구·나이·상황(임신·학생·구직·장애·한부모·다자녀·무주택 등)·소득을 고르면 받을 수 있을지도 모르는 정부·지자체 혜택만 골라 드려요. 고른 조건은 저장하지 않아요.',alternates:{canonical:'/find'}};
export default function FindPage(){
  return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 나에게 맞는 혜택</nav>
    <h1>나에게 맞는 혜택 찾기</h1>
    <p className="bf-lead">정부24에 등록된 혜택 {n(items.length)}가지에는 나이·소득·상황별로 ‘받을 수 있는 사람’ 표시가 있어요. 사는 곳과 상황을 고르면 그 표시로 맞는 혜택만 골라 드려요.</p>
    <Find regions={regionsLite}/>
    <Faq items={[['어떤 상황을 고를 수 있나요?',`${[...LIFE,...HOUSE].map(c=>CODE_LABEL[c]).join(', ')}를 고를 수 있어요.`],['고른 조건은 어디에 저장되나요?','이 브라우저 안(localStorage)에만 저장돼요. 서버로 보내지 않고, 목록에서 맞추는 일도 휴대폰 안에서 해요.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 혜택',SITE+'/'],['나에게 맞는 혜택',SITE+'/find']])}/></div>;
}
