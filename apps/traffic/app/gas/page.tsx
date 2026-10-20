import {SITE as SITE_} from '../../lib/format';
import Link from 'next/link';
import type {Metadata} from 'next';
import {AdSlot} from '@guidejung/ui/ads';
import {Connect,GENERIC} from '@guidejung/ui/network';
import {SITE,fetched,fmtDate,gasStat,roadName,rests,won} from '../../lib/data';
import {Faq,ga,JsonLd,breadcrumbLd} from '@guidejung/ui/seo';
export const metadata:Metadata={title:'고속도로 휴게소 기름값 순위 - 휘발유·경유 싼 곳',description:'전국 고속도로 휴게소 주유소의 휘발유·경유 가격을 싼 순서로 비교하세요. 노선과 방향, 평균 가격도 함께 보여 드립니다.',alternates:{canonical:SITE+'/gas'}};
function Rank({k,label}:{k:'gasoline'|'diesel';label:string}){
  const list=rests.filter(r=>won(r.gas?.[k])).sort((a,b)=>won(a.gas![k])!-won(b.gas![k])!);
  const avg=Math.round(list.reduce((a,r)=>a+won(r.gas![k])!,0)/Math.max(1,list.length));
  return <section className="section"><div className="section-heading"><h2>{label} 싼 휴게소 TOP 20</h2><span className="muted small">평균 {avg.toLocaleString()}원 · {list.length}곳</span></div>
    <ol className="tf-top">{list.slice(0,20).map((r,i)=><li key={r.code}><Link href={`/rest/${r.code}`}><span className="tf-rank">{i+1}</span><span className="tf-zname"><b>{r.name}</b><small>{roadName({name:r.route})}{r.dir?` · ${r.dir} 방향`:''}</small></span><span className="tf-speed"><b>{won(r.gas![k])!.toLocaleString()}</b>원<small>평균 −{avg-won(r.gas![k])!}원</small></span></Link></li>)}</ol></section>;
}
export default function GasPage(){
  return <><section className="section"><div className="eyebrow">FUEL PRICE</div><h1>고속도로 휴게소 기름값 순위</h1><p className="muted">한국도로공사 휴게소 주유소 가격 · {fmtDate(fetched)} 기준. 가격은 매일 갱신되며 현장 가격과 다를 수 있습니다.</p></section>
    <Rank k="gasoline" label="휘발유"/><AdSlot/><Rank k="diesel" label="경유"/><Faq title="휴게소 기름값 자주 묻는 질문" items={[
      [`고속도로 휴게소 중 휘발유가 가장 싼 곳은 어디인가요?`,(()=>{const g=gasStat('gasoline');const c=g.list[0];return c?`${fmtDate(fetched)} 한국도로공사 자료 기준 ${roadName({name:c.route})} ${c.dir?`${c.dir} 방향 `:''}${ga(c.name)} ${won(c.gas!.gasoline)!.toLocaleString()}원으로 가장 쌉니다. 전국 휴게소 평균은 ${g.avg.toLocaleString()}원입니다.`:'';})()],
      [`고속도로 휴게소 중 경유가 가장 싼 곳은 어디인가요?`,(()=>{const g=gasStat('diesel');const c=g.list[0];return c?`${roadName({name:c.route})} ${c.dir?`${c.dir} 방향 `:''}${ga(c.name)} ${won(c.gas!.diesel)!.toLocaleString()}원으로 가장 쌉니다. 전국 휴게소 평균은 ${g.avg.toLocaleString()}원입니다.`:'';})()],
      ['휴게소 기름값은 얼마나 자주 바뀌나요?',`한국도로공사 휴게소 주유소 가격을 매일 한 번 받아 갱신합니다(지금 ${fmtDate(fetched)} 기준). 실제 가격은 현장에서 다를 수 있습니다.`]]}/><Connect title="떠나기 전에" items={[{icon:'⚡',title:'전기차라면 충전소',desc:'내 주변 지금 비어 있는 충전기',href:'https://charge.guidejung.com'},GENERIC.weather,GENERIC.trip]}/><JsonLd data={breadcrumbLd([['내근처 고속도로',SITE_+'/'],['휴게소 기름값',SITE_+'/gas']])}/></>;
}
