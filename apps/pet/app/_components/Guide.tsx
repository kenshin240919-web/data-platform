import Link from 'next/link';
import {KIND_ORDER,KINDS,n,type Kind} from '../../lib/fmt';
// 판단을 돕는 안내(설계안 4장: 공공데이터·법령으로 확인한 사실만, 진단·치료 효과 단정 없음).
export function KindCards({counts,h24,base=''}:{counts:Record<Kind,number>;h24?:number;base?:string}){
  return <section><h2>어떤 곳을 찾으세요?</h2><div className="pt-kinds">
    {h24!=null&&h24>0&&<Link href="/24h" className="pt-kindcard h24"><span aria-hidden="true">🚨</span><span><b>24시 동물병원</b><small>밤·주말에 찾는 이름에 ‘24’가 든 동물병원</small></span><em>{n(h24)}곳</em></Link>}
    {KIND_ORDER.filter(k=>counts[k]).map(k=><Link key={k} href={`${base}/${k}`} className="pt-kindcard">
    <span aria-hidden="true">{KINDS[k].icon}</span><span><b>{KINDS[k].title}</b><small>{KINDS[k].desc}</small></span><em>{n(counts[k])}곳</em></Link>)}</div></section>;
}
export function HoursNote(){
  return <section className="pt-guide"><h2>💬 진료 시간은요?</h2>
    <p>지자체 공공데이터에는 동물병원 이름·주소·전화·개설일만 있고 <b>진료 시간·진료 과목·가격은 없어요</b>. ‘24시’는 병원 이름에 24가 들어간 곳을 모은 것이라, 실제로 밤새 진료하는지는 <b>📞 전화</b>나 상세의 <b>‘네이버 지도에서 진료 시간 보기’</b>로 꼭 확인하세요.</p>
    <p>동물약국은 대부분 사람 약국이 함께 신고한 곳이라, 약국 영업 시간(국립중앙의료원)을 붙여 <b>지금 문 연 곳</b>을 보여 드려요.</p></section>;
}
export function SickGuide(){
  return <section className="pt-guide"><h2>🚑 우리 아이가 아플 때 순서</h2><ol>
    <li><b>먼저 전화하세요</b><span>가까운 동물병원(밤·주말에는 24시 동물병원)에 증상을 말하고 지금 진료가 되는지 물어보세요. 이동 중에 준비할 것도 알려 줘요.</span></li>
    <li><b>이동할 때는 안전하게</b><span>이동장이나 담요로 몸을 감싸 움직임을 줄이세요. 차가 없으면 <Link href="/taxi">펫택시</Link>를 찾을 수 있어요.</span></li>
    <li><b>먹은 것·증상을 적어 가세요</b><span>삼킨 물건이나 약의 포장, 증상이 시작된 시각을 챙기면 진료에 도움이 돼요.</span></li>
    <li><b>약은 수의사와 상의하세요</b><span>사람 약을 함부로 먹이지 마세요. 동물약국에서 파는 약도 수의사 처방이 필요한 것이 있어요.</span></li>
  </ol><p className="muted small">이 안내는 일반적인 순서예요. 진단·치료는 수의사에게 받으세요.</p></section>;
}
export function KindGuide(){
  return <section className="pt-guide"><h2>📋 알아 두면 좋은 것</h2><dl className="pt-types">
    <div><dt>🏥 동물병원</dt><dd>수의사법에 따라 수의사가 개설해 시·군·구에 신고한 곳이에요. 이 사이트에는 영업 중으로 신고된 곳만 있어요.</dd></div>
    <div><dt>💊 동물약국</dt><dd>약사법에 따라 동물용 의약품을 팔겠다고 신고한 약국이에요. 대부분 동네 약국이라 사람 약국 영업 시간을 함께 보여 드려요. <Link href="/pharmacy">지금 문 연 동물약국 →</Link></dd></div>
    <div><dt>🏠 동물보호센터</dt><dd>동물보호법에 따라 지자체가 유실·유기동물을 구조·보호하도록 지정한 곳이에요. <Link href="/adopt">보호 중인 아이들 →</Link></dd></div>
    <div><dt>🏨 펫호텔·유치원</dt><dd>동물보호법의 동물위탁관리업으로 등록한 곳이에요. 동물병원이 함께 등록한 곳은 병원에 ‘호텔’로 표시했어요.</dd></div>
    <div><dt>☕ 애견·고양이 카페</dt><dd>동물을 보여 주거나 만질 수 있게 하는 동물전시업으로 등록한 곳이에요.</dd></div>
    <div><dt>🚕 펫택시</dt><dd>반려동물을 태워 옮기는 동물운송업으로 등록한 업체예요. 이름이 차량 번호인 곳도 있어요.</dd></div>
  </dl></section>;
}
