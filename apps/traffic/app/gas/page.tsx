import Link from 'next/link';
import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {Connect,GENERIC} from '@guidejung/ui/network';
import {SITE,fetched,fmtDate,roadName,rests,won} from '../../lib/data';
export const metadata:Metadata={title:'고속도로 휴게소 기름값 순위 - 휘발유·경유 싼 곳',description:'전국 고속도로 휴게소 주유소의 휘발유·경유 가격을 싼 순서로 비교하세요. 노선과 방향, 평균 가격도 함께 보여 드립니다.',alternates:{canonical:SITE+'/gas'}};
function Rank({k,label}:{k:'gasoline'|'diesel';label:string}){
  const list=rests.filter(r=>won(r.gas?.[k])).sort((a,b)=>won(a.gas![k])!-won(b.gas![k])!);
  const avg=Math.round(list.reduce((a,r)=>a+won(r.gas![k])!,0)/Math.max(1,list.length));
  return <section className="section"><div className="section-heading"><h2>{label} 싼 휴게소 TOP 20</h2><span className="muted small">평균 {avg.toLocaleString()}원 · {list.length}곳</span></div>
    <ol className="tf-top">{list.slice(0,20).map((r,i)=><li key={r.code}><Link href={`/rest/${r.code}`}><span className="tf-rank">{i+1}</span><span className="tf-zname"><b>{r.name}</b><small>{roadName({name:r.route})}{r.dir?` · ${r.dir} 방향`:''}</small></span><span className="tf-speed"><b>{won(r.gas![k])!.toLocaleString()}</b>원<small>평균 −{avg-won(r.gas![k])!}원</small></span></Link></li>)}</ol></section>;
}
export default function GasPage(){
  return <><section className="section"><div className="eyebrow">FUEL PRICE</div><h1>고속도로 휴게소 기름값 순위</h1><p className="muted">한국도로공사 휴게소 주유소 가격 · {fmtDate(fetched)} 기준. 가격은 매일 갱신되며 현장 가격과 다를 수 있습니다.</p></section>
    <Rank k="gasoline" label="휘발유"/><AdSlot/><Rank k="diesel" label="경유"/><Connect title="떠나기 전에" items={[{icon:'⚡',title:'전기차라면 충전소',desc:'내 주변 지금 비어 있는 충전기',href:'https://charge.guidejung.com'},GENERIC.weather,GENERIC.trip]}/></>;
}
