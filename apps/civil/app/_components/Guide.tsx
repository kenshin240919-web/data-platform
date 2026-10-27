import Link from 'next/link';
import {KIND_ORDER,KINDS,n,type Kind} from '../../lib/fmt';
export function KindCards({counts}:{counts:Record<Kind,number>}){
  return <section><h2>어디로 가세요?</h2><div className="cv-kinds">{KIND_ORDER.filter(k=>counts[k]).map(k=><Link key={k} href={`/${k}`} className="cv-kindcard">
    <span aria-hidden="true">{KINDS[k].icon}</span><span><b>{KINDS[k].title}</b><small>{KINDS[k].desc}</small></span><em>{n(counts[k])}{k==='kiosk'?'대':'곳'}</em></Link>)}</div></section>;
}
export function DocChips({items}:{items:{slug:string;title:string;count:number}[]}){
  return <section><h2>🧾 어떤 서류가 필요하세요?</h2><div className="cv-jump">{items.filter(d=>d.count).map(d=><Link key={d.slug} href={`/doc/${d.slug}`}>{d.title} <small>{n(d.count)}대</small></Link>)}</div></section>;
}
export function HowTo(){
  return <section className="cv-guide"><h2>📋 서류 떼기 전에 알아 두면 좋은 것</h2><dl className="cv-types">
    <div><dt>🖨️ 무인민원발급기</dt><dd>지문으로 본인 확인을 하고 바로 뽑는 기계예요. 기계마다 뗄 수 있는 서류와 운영 시간이 달라서, 상세 페이지에서 서류 목록을 먼저 확인하세요. 수수료는 서류·지자체마다 달라요.</dd></div>
    <div><dt>💻 정부24(온라인)</dt><dd>주민등록등본·초본처럼 많은 서류는 정부24에서 온라인으로 떼어 집에서 출력할 수도 있어요. 프린터가 없으면 <Link href="/print">근처 무인 프린트</Link>에서 뽑으세요.</dd></div>
    <div><dt>🏢 주민센터</dt><dd>대부분 평일 09:00~18:00에 열어요. 발급기에서 안 되는 서류(인감증명서 등)는 신분증을 들고 주민센터로 가세요. 운영 시간은 공공데이터에 없어 일반 기준을 적었어요.</dd></div>
    <div><dt>⏱️ 시·구청 민원실</dt><dd>일부 시·구청 민원실은 지금 대기 인원을 공개해요. 상세 페이지에서 업무별 대기 인원을 보고 덜 붐빌 때 가세요.</dd></div>
    <div><dt>📮 우체국</dt><dd>뗀 서류를 등기로 부칠 때 가요. 우편 업무와 금융 업무 시간이 달라요.</dd></div>
  </dl></section>;
}
