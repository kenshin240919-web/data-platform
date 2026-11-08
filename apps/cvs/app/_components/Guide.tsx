import Link from 'next/link';
import {HOSPITAL,PHARMACY} from '../../lib/fmt';
// 판단을 돕는 안내: 약사법 원문(제44조의2·제44조의3, 2026-11-08 국가법령정보센터 확인)으로 확인한 사실만. 복용 안내·약 추천은 하지 않음.
export function MedicineGuide(){
  return <section className="cv-guide"><h2>📋 편의점 상비약, 알아 두면 좋은 것</h2><dl className="cv-types">
    <div><dt>💊 안전상비의약품이란</dt><dd>일반의약품 가운데 가벼운 증상에 급하게 쓰고 스스로 판단해 쓸 수 있는 약으로, 보건복지부장관이 20개 품목 이내에서 정해 고시해요(약사법 제44조의2).</dd></div>
    <div><dt>🏪 아무 편의점에서나 파나요?</dt><dd>아니요. 약국이 아닌 곳에서 팔려면 시장·군수·구청장에게 <b>안전상비의약품 판매자로 등록</b>해야 해요. 이 사이트에는 등록된 곳만 있어요.</dd></div>
    <div><dt>🌙 밤에도 열어요?</dt><dd>등록하려면 <b>24시간 연중 무휴 점포</b>를 갖춰야 해요(약사법 제44조의2 제2항). 그래도 실제 영업 시간은 매장마다 바뀔 수 있으니 급하면 전화로 확인하세요.</dd></div>
    <div><dt>🎓 판매자 교육</dt><dd>판매자로 등록하려는 사람은 미리 안전성 확보와 품질관리에 관한 교육을 받아야 해요(약사법 제44조의3).</dd></div>
  </dl></section>;
}
export function NightSteps(){
  return <section className="cv-guide"><h2>🌙 밤에 갑자기 아플 때 순서</h2><ol>
    <li><b>지금 문 연 약국부터</b><span>약사에게 물어보고 살 수 있어요. <a href={PHARMACY}>내 주변 지금 문 연 약국 →</a></span></li>
    <li><b>약국이 모두 닫았으면 상비약 파는 편의점</b><span>가까운 곳을 고르세요. 약 상자의 사용상 주의사항을 꼭 읽으세요.</span></li>
    <li><b>증상이 심하거나 오래가면 병원·응급실</b><span>숨쉬기 힘들거나 의식이 흐리면 바로 119에 전화하세요. <a href={`${HOSPITAL}/er`}>응급실 남은 병상 보기 →</a></span></li>
  </ol><p className="muted small">이 사이트는 약을 추천하거나 복용법을 안내하지 않아요. <Link href="/medicine">상비약 안내 더 보기</Link></p></section>;
}
