// 연말정산 서류·일정(11/27 요청서 — 트렌드 '연말정산 서류' 1월 둘째 주 정점). 공식 발표 전 날짜는 '작년 기준'으로만, 법으로 정한 날짜는 법 조문으로.
import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Ad} from '../../../_components/Ad';
import {SITE} from '../../../../lib/fmt';
import {YE_YEAR} from '../../../../lib/yearend';

const Y=YE_YEAR,N=YE_YEAR+1;
const title=`${N} 연말정산 서류·일정 — 간소화 서비스 언제 열리나, 따로 챙길 서류`;
export const metadata:Metadata={title,description:`${Y}년 귀속(${N}년 1~2월) 연말정산 준비: 국세청 간소화 서비스로 받는 자료, 간소화에 없어 따로 챙길 서류(월세·안경·교복·기부금), 회사 정산·제출 기한. 날짜는 국세청 발표 전이면 작년 기준으로 표시.`,alternates:{canonical:'/calc/yearend/documents'}};
const faq:[string,string][]=[
  [`${N}년 연말정산 간소화 서비스는 언제 열리나요?`,`국세청이 아직 ${N}년 개통일을 발표하지 않았어요(2026-11-27 확인). 지난해에는 1월 15일에 열렸어요. 발표되면 이 페이지를 고칠게요.`],
  ['연말정산 서류는 언제까지 내나요?','회사가 정한 날까지예요. 회사는 다음 해 2월 급여를 줄 때 연말정산을 하고(소득세법 제137조), 지급명세서를 3월 10일까지 내야 해서(제164조) 보통 1월 말~2월 초로 마감을 잡아요.'],
  ['간소화 서비스에 없는 자료는 어떻게 하나요?','월세, 일부 안경·콘택트렌즈 구입비, 교복비, 간소화에 자료를 내지 않은 단체의 기부금처럼 빠진 자료는 발급처에서 영수증·증명서를 받아 회사에 함께 내요.'],
  ['부양가족 자료가 간소화에 안 보여요.','성인 부양가족은 본인이 홈택스에서 자료 제공에 동의해야 내 화면에서 보여요. 동의한 뒤 다시 조회하세요.'],
];
export default function YearendDocs(){
  return <div className="page prose">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/calc">계산기</Link> › <Link href="/calc/yearend">연말정산</Link> › 서류·일정</nav>
    <h1>🗂️ {N} 연말정산 서류·일정</h1>
    <p className="jb-answer"><b>{Y}년 귀속</b> 연말정산은 {N}년 1~2월에 회사에서 해요. 대부분 자료는 <b>국세청 간소화 서비스</b>에서 받고, 간소화에 없는 것만 따로 챙기면 돼요. <span className="muted">(간소화 개통일은 국세청 발표 전 — 지난해는 1월 15일)</span></p>
    <p className="jb-hp"><Link href="/calc/yearend">🧮 내 연봉으로 세금 어림하기</Link><a href="https://www.hometax.go.kr" rel="noopener" target="_blank">국세청 홈택스 ↗</a></p>
    <section><h2>📅 일정</h2>
      <table className="jb-table"><tbody>
        <tr><th>간소화 서비스 개통</th><td>{N}년 1월 중 — <b>국세청 발표 전</b>(지난해 1월 15일)</td></tr>
        <tr><th>회사 서류 마감</th><td>회사마다 달라요(보통 1월 말~2월 초) — 회사 안내 확인</td></tr>
        <tr><th>회사 정산</th><td>{N}년 2월분 급여를 줄 때(소득세법 제137조) — 환급·추가 납부가 이때 반영</td></tr>
        <tr><th>지급명세서 제출</th><td>{N}년 3월 10일까지 회사가 세무서에(소득세법 제164조)</td></tr>
        <tr><th>놓친 공제</th><td>5월 종합소득세 신고 때 직접 넣을 수 있어요 — <Link href="/calc/yearend/quit">중도 퇴사자도 같은 방법</Link></td></tr>
      </tbody></table>
      <p className="muted small">확인 2026-11-27. 개통일·마감은 국세청·회사 발표가 우선이에요.</p></section>
    <section><h2>✅ 간소화 서비스에서 받는 것</h2>
      <p>홈택스(손택스)에서 내 공제 자료를 모아 보고 PDF로 받아 회사에 내요: 보험료·의료비·교육비·신용카드 등 사용액·주택자금·연금저축·기부금(간소화에 자료를 낸 곳) 등. 회사가 일괄 제공 방식을 쓰면 동의만 하면 돼요.</p></section>
    <Ad/>
    <section><h2>📎 간소화에 없을 수 있어 따로 챙길 것</h2><ul>
      <li><b>월세</b>: 임대차계약서 사본, 월세를 낸 기록(이체 내역), 주민등록등본 — 등본은 <a href="https://minwon.guidejung.com/doc/resident">무인민원발급기</a>에서 바로 뗄 수 있어요. 얼마나 돌려받는지는 <Link href="/calc/yearend/rent">월세 세액공제 계산</Link>.</li>
      <li><b>안경·콘택트렌즈</b>: 간소화에 없으면 안경점에서 구입 영수증.</li>
      <li><b>중·고등학생 교복비</b>: 간소화에 없으면 교복 판매처 영수증.</li>
      <li><b>기부금</b>: 간소화에 자료를 내지 않은 단체(일부 종교단체 등)는 그 단체의 기부금 영수증.</li>
      <li><b>부양가족 자료</b>: 성인 가족은 본인이 홈택스에서 자료 제공에 동의해야 보여요.</li>
    </ul><p className="muted small">간소화에 있는지 먼저 확인하고, 없을 때만 따로 받으세요. 회사마다 내는 방법(PDF·종이·사내 시스템)이 달라요.</p></section>
    <section><h2>상황별로 보기</h2><div className="jb-jump"><Link href="/calc/yearend/tips">💰 13월의 월급 늘리는 법</Link><Link href="/calc/yearend/couple">👫 맞벌이</Link><Link href="/calc/yearend/rent">🏠 월세</Link><Link href="/calc/yearend/first">🌱 신입</Link><Link href="/calc/yearend/quit">🚪 중도 퇴사</Link></div></section>
    <Faq items={faq}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['계산기',SITE+'/calc'],['연말정산',SITE+'/calc/yearend'],['서류·일정',SITE+'/calc/yearend/documents']])}/>
  </div>;
}
