import type {Metadata} from 'next';
import Link from 'next/link';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {FineCalc} from '../_components/FineCalc';
import {NearCenter} from '../_components/NearCenter';
import {n,nation,ofKind,regions,SITE} from '../../lib/data';
export const metadata:Metadata={title:'자동차 검사 기한·과태료 계산기 · 내 주변 자동차 검사소',description:`검사 기간 마지막 날을 넣으면 남은 날과 늦었을 때 예상 과태료(최대 60만 원)를 계산해 드려요. 지자체 등록 자동차 검사소 ${nation.kinds.inspect.toLocaleString('ko-KR')}곳(공단·민간 지정)을 가까운 순으로.`,alternates:{canonical:'/inspection'}};
export default function Inspection(){
  const rs=regions.filter(r=>r.kinds.inspect).sort((a,b)=>b.kinds.inspect-a.kinds.inspect);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 자동차 검사</nav>
    <h1>자동차 검사, 언제까지 어디서?</h1>
    <FineCalc/>
    <h2>📍 내 주변 자동차 검사소</h2>
    <NearCenter kind="inspect"/>
    <p className="sv-note">이 목록은 지자체가 등록한 검사소 {n(nation.kinds.inspect)}곳이에요. 지역에 따라 빠진 곳이 많을 수 있어요(예: 서울·부산은 적게 등록됨). 한국교통안전공단 누리집의 검사소 찾기·예약도 함께 확인하세요.</p>
    <AdSlot/>
    <section><h2>검사소가 등록된 지역</h2><div className="sv-sidos">{rs.map(r=><Link key={r.id} href={`/region/${r.id}/inspect`}><b>{r.name}</b><span>{n(r.kinds.inspect)}곳</span></Link>)}</div></section>
    <Faq items={[
      ['자동차 검사를 늦게 받으면 과태료가 얼마인가요?','여러 안내에 따르면 검사 기간이 끝난 뒤 30일 이내 4만 원, 31일째부터 3일마다 2만 원씩 늘어 최대 60만 원입니다. 정확한 금액은 관할 시·군·구청 고지서로 확인하세요.'],
      ['검사소는 공단과 민간 중 어디서 받나요?',`이 사이트의 검사소 ${n(nation.kinds.inspect)}곳 중 공공(한국교통안전공단) ${n(ofKind(regions.flatMap(r=>r.items),'inspect').filter(p=>p.sub?.startsWith('공공')).length)}곳, 민간 지정 검사소가 나머지입니다. 어느 곳에서든 정기검사를 받을 수 있고, 상세 페이지에서 검사 종류를 확인할 수 있습니다.`],
      ['부득이하게 검사를 못 받으면?','검사 기간 안에 증빙 서류를 붙여 연장을 신청해야 합니다. 기간이 지난 뒤 신청하면 과태료가 부과될 수 있습니다.'],
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 서비스센터',SITE+'/'],['자동차 검사',SITE+'/inspection']])}/>
  </div>;
}
