// 전국 평균 가격 최근 추이(막대). 서버 컴포넌트.
import {won} from '../../lib/fmt';
export function Trend({rows}:{rows:{date:string;price:number}[]}){
  if(rows.length<2)return null;const min=Math.min(...rows.map(r=>r.price)),max=Math.max(...rows.map(r=>r.price));const span=Math.max(max-min,10);
  return <div className="oi-trend" aria-label="최근 평균 가격 추이">{rows.map(r=><div key={r.date} title={`${r.date} ${won(r.price)}`}>
    <span>{Math.round(r.price).toLocaleString('ko-KR')}</span><i style={{height:`${20+70*(r.price-min)/span}%`}}></i><span>{+r.date.slice(4,6)}/{+r.date.slice(6,8)}</span></div>)}</div>;
}
