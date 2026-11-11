import Link from 'next/link';
import {GS_PAGES} from '../../lib/gs';
/** 다른 GS25 매장 서비스 페이지로 가는 카드(현재 페이지는 뺌). */
export function GsLinks({here}:{here:string}){
  return <section><h2>내 주변 GS25에서 이것도 찾아보세요</h2>
    <div className="cv-sidos cv-gs">{GS_PAGES.filter(p=>p.path!==here).map(p=><Link key={p.path} href={p.path}><b>{p.icon} {p.label}</b><span>{p.desc}</span></Link>)}</div></section>;
}
