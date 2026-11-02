import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Ad} from '../_components/Ad';
import {LINKS,n,nation,SITE} from '../../lib/data';
export const metadata:Metadata={title:'상황별 안내 — 일을 그만뒀을 때·일당 일자리·경력단절·어르신·청년',description:'일을 그만뒀을 때(관할 고용센터·실업급여), 오늘 일당 일자리(직업소개소 이용 전 확인할 것), 경력단절 여성(새일센터), 어르신(노인일자리), 청년(대학일자리플러스센터) — 어디로 가면 되는지 순서대로.',alternates:{canonical:'/guide'}};
export default function Guide(){
  const k=nation.kinds;
  return <div className="page prose jb-guide">
    <nav className="crumbs"><Link href="/">홈</Link> › 상황별 안내</nav>
    <h1>상황별 안내 — 어디로 가면 될까요?</h1>
    <p className="jb-note">이 페이지는 공식 안내로 가는 길잡이예요. 자격·금액·기간 같은 조건은 바뀔 수 있어 적지 않았어요. 꼭 공식 누리집에서 확인하세요.</p>
    <section id="quit"><h2>😮‍💨 일을 그만뒀어요</h2><ol>
      <li><b>회사에 이직 확인 처리를 물어보세요</b><span>실업급여 심사에 회사가 내는 서류(이직확인서)가 쓰여요.</span></li>
      <li><b>고용24에서 구직 신청</b><span><a href={LINKS.work24} rel="noopener" target="_blank">고용24</a>에서 구직 신청과 수급자격 신청 전 교육을 안내받을 수 있어요.</span></li>
      <li><b>관할 고용센터에 신청</b><span>주민등록 주소지를 관할하는 고용센터(전국 {n(k.center)}곳)에서 신청해요. <Link href="/center">시군구별 관할 고용센터 보기</Link></span></li>
      <li><b>받을 수 있는 다른 지원도 확인</b><span>지자체의 구직·청년·중장년 지원은 <a href="https://benefit.guidejung.com/topic">내근처 혜택</a>에서 우리 동네 것만 모아 볼 수 있어요.</span></li>
    </ol></section>
    <Ad/>
    <section id="today"><h2>🔨 오늘 일당 일자리</h2><ol>
      <li><b>등록된 직업소개소인지 확인</b><span>이 사이트의 직업소개소({n(k.agency)}곳)는 지자체에 등록된 영업 중인 곳이에요. <Link href="/agency">내 주변 직업소개소</Link></span></li>
      <li><b>선급금은 내지 마세요</b><span>유료직업소개소는 구직자에게 선급금을 받을 수 없어요(직업안정법 제21조의2). 소개 요금은 고용노동부가 고시한 기준을 따라야 해요.</span></li>
      <li><b>근로계약서와 안전교육</b><span>일하는 시간·임금이 적힌 근로계약서를 받으세요. 건설 현장은 건설업 기초안전보건교육 이수증이 필요해요.</span></li>
      <li><b>무료로 소개받는 곳도 있어요</b><span>지자체·단체의 <Link href="/free">무료직업소개소</Link>({n(k.free)}곳)는 수수료가 없어요.</span></li>
    </ol></section>
    <section id="women"><h2>👩 다시 일하고 싶어요(경력단절)</h2><ol>
      <li><b>가까운 새일센터에 상담 신청</b><span>여성새로일하기센터(전국 {n(k.women)}곳)에서 구직 상담·직업교육·인턴을 안내해요. <Link href="/women">내 주변 새일센터</Link></span></li>
      <li><b>직업교육 과정 찾기</b><span>교육 과정과 일정은 <a href={LINKS.saeil} rel="noopener" target="_blank">e새일</a>에서 확인하세요.</span></li>
    </ol></section>
    <section id="senior"><h2>👴 어르신 일자리</h2><ol>
      <li><b>노인일자리 여기에서 공고 찾기</b><span><a href={LINKS.senior} rel="noopener" target="_blank">노인일자리 여기</a>(한국노인인력개발원)에서 참여자 모집을 찾을 수 있어요.</span></li>
      <li><b>가까운 수행기관에 문의</b><span>시니어클럽·노인복지관 같은 수행기관(전국 {n(k.senior)}곳)이 사업을 해요. <Link href="/senior">내 주변 노인일자리 기관</Link></span></li>
    </ol></section>
    <section id="youth"><h2>🎓 청년·대학생</h2><ol>
      <li><b>대학일자리플러스센터</b><span>대학 안 센터({n(k.campus)}곳)에서 진로·취업 상담을 해요. 이용 대상은 센터마다 달라 미리 확인하세요. <Link href="/campus">센터 목록</Link></span></li>
      <li><b>청년 지원 혜택</b><span>우리 동네 청년 지원은 <a href="https://benefit.guidejung.com/find">내근처 혜택 맞춤 찾기</a>에서.</span></li>
    </ol></section>
    <section><h2>🧾 준비 서류</h2><p>이력서에 붙일 증명서(주민등록등본·졸업증명서·고용보험 자격이력내역서 등)는 <a href="https://minwon.guidejung.com">내근처 서류</a>에서 가까운 무인민원발급기로 뗄 수 있어요. 음식점 일을 하려면 보건증(건강진단결과서)이 필요할 수 있어요 — 보건소·병원에서 받아요.</p></section>
    <Faq items={[
      ['실업급여는 어디서 신청하나요?','주민등록 주소지를 관할하는 고용센터에서 신청합니다. 시군구별 관할 센터는 ‘고용센터’ 메뉴에서 확인하세요.'],
      ['직업소개소가 선급금을 달라고 하면?','유료직업소개소는 구직자에게 선급금을 받을 수 없습니다(직업안정법 제21조의2). 관할 시·군·구청이나 고용노동부(국번 없이 1350)에 문의하세요.'],
      ['이 사이트에서 일자리를 소개해 주나요?','아니요. 이 사이트는 일자리를 소개하거나 채용 공고를 싣지 않고, 찾아갈 기관만 알려 드립니다.'],
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['상황별 안내',SITE+'/guide']])}/>
  </div>;
}
