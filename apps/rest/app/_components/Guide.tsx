import Link from 'next/link';
import {KIND_ORDER,KINDS,n,type Kind} from '../../lib/fmt';
// 판단을 돕는 안내(설계안 4장: 공공데이터·법령으로 확인한 사실만, 효과 단정·외모 묘사 없음).
export function KindCards({counts,base=''}:{counts:Record<Kind,number>;base?:string}){
  return <section><h2>어떤 곳을 찾으세요?</h2><div className="rs-kinds">{KIND_ORDER.filter(k=>counts[k]).map(k=><Link key={k} href={`${base}/${k}`} className="rs-kindcard">
    <span aria-hidden="true">{KINDS[k].icon}</span><span><b>{KINDS[k].title}</b><small>{KINDS[k].desc}</small></span><em>{n(counts[k])}곳</em></Link>)}</div></section>;
}
export function PriceNote(){
  return <section className="rs-guide"><h2>💬 가격·예약·영업 시간은요?</h2>
    <p>지자체 공공데이터에는 업소 이름·주소·전화·신고일만 있고 <b>가격·예약·영업 시간은 없어요</b>. 숫자를 지어내지 않고, 상세 페이지의 <b>‘네이버 지도에서 가격·예약 보기’</b>·<b>📞 전화</b> 버튼으로 바로 확인하실 수 있게 했어요.</p></section>;
}
export function KindGuide(){
  return <section className="rs-guide"><h2>📋 알아 두면 좋은 것</h2><dl className="rs-types">
    <div><dt>♨️ 찜질방·사우나·목욕탕</dt><dd>공중위생관리법의 목욕장업으로 시·군·구에 신고한 곳이에요. 공동탕(대중목욕탕), 찜질시설, 한증막으로 나뉘어 신고돼요.</dd></div>
    <div><dt>🛁 1인·프라이빗 목욕·세신</dt><dd>혼자 또는 일행끼리 쓰는 1인 목욕탕·프라이빗 사우나·세신샵이에요. 대부분 목욕장업(‘목욕장업 기타’)으로, 일부 세신샵은 미용업으로 신고돼 있어요. <Link href="/private">전국 목록 보기 →</Link></dd></div>
    <div><dt>🙌 안마원·안마시술소</dt><dd>의료법(제82조)에 따라 안마사 자격은 시각장애인 중 시·도지사의 자격인정을 받은 사람에게 주어지고, 안마원·안마시술소는 안마사가 개설해 신고한 곳이에요.</dd></div>
    <div><dt>🧴 피부관리실</dt><dd>공중위생관리법의 피부미용업으로 신고한 곳이에요. 피부미용업에서는 의료기기나 의약품을 쓰는 시술을 할 수 없어요.</dd></div>
  </dl><p className="muted small">이 사이트에는 영업 중으로 신고된 곳만 있어요. 출장 마사지는 다루지 않아요. 이름에 선정적인 표현이 들어간 곳은 목록에서 뺐어요.</p></section>;
}
