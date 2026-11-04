import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Ad} from '../../_components/Ad';
import {LINKS,n,nation,SITE} from '../../../lib/data';
import {board,buildDay,byCat,CATS,cats,mdw,span,years,type Cat} from '../../../lib/scheduleData';
import {Board} from '../Board';
import {RoundTable} from '../Table';
export const dynamicParams=false;
export function generateStaticParams(){return cats.map(slug=>({slug}));}
type P={params:Promise<{slug:string}>};
const get=async(p:P['params'])=>{const c=(await p).slug as Cat;return CATS[c]&&cats.includes(c)?c:null;};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const c=await get(params);if(!c)return {};
  const l=byCat(c),Y=years[0],y0=l.filter(r=>r.y===Y);
  return {title:`${Y} ${CATS[c].name} 시험 일정 — ${y0.length}회차 원서 접수·시험·합격 발표`,
    description:`${Y}년 ${CATS[c].name} 시험 일정 ${y0.length}회차: ${y0.slice(0,3).map(r=>`${r.label} ${CATS[c].written} 접수 ${r.dr.map(span).join(', ')||'-'}`).join(' · ')} 등. 한국산업인력공단 자료.`,alternates:{canonical:`/schedule/${c}`}};
}
export default async function CatPage({params}:P){
  const c=await get(params);if(!c)notFound();
  const l=byCat(c),C=CATS[c],b=board(l,buildDay);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/schedule">자격증 시험 일정</Link> › {C.name}</nav>
    <h1>{C.icon} {years[0]} {C.name} 시험 일정</h1>
    <p className="muted">{C.desc}</p>
    <Board list={l} build={buildDay}/>
    <div className="jb-jump">{cats.filter(o=>o!==c).map(o=><Link key={o} href={`/schedule/${o}`}>{CATS[o].icon} {CATS[o].name} <small>{n(byCat(o).length)}</small></Link>)}</div>
    {years.map(y=>{const yl=l.filter(r=>r.y===y);return yl.length?<section key={y}><h2>{y}년 {C.name} 회차별 일정 <span className="muted">{yl.length}회차</span></h2><RoundTable list={yl}/></section>:null;})}
    <p className="muted small">같은 회차 이름이 여러 줄이면 공단 자료에 시험 날짜가 다른 일정이 따로 올라와 있는 것이고, 접수 기간이 두 개인 회차는 자료에 두 번 올라온 기간을 함께 적었어요. 내 종목의 정확한 일정은 <a href={LINKS.qnet} rel="noopener" target="_blank">큐넷</a>에서 확인하세요.</p>
    <Ad/>
    <div className="jb-jump"><Link href="/exam">📝 내 근처 자격증 시험장 <small>{n(nation.kinds.exam)}</small></Link><Link href="/schedule">📅 전체 시험 일정</Link></div>
    <Faq items={([
      [`${years[0]}년 ${C.name} 시험은 몇 번 있나요?`,`한국산업인력공단 일정에 ${l.filter(r=>r.y===years[0]).length}회차가 올라와 있습니다.`],
      ...l.filter(r=>r.y===years[0]&&r.de?.[0]).slice(0,3).map(r=>[`${years[0]}년 ${C.name} ${r.label} ${C.written} 시험은 언제인가요?`,`${C.written} 시험은 ${mdw(r.de![0])}${r.de![1]&&r.de![1]!==r.de![0]?`~${mdw(r.de![1])}`:''}, 원서 접수는 ${r.dr.map(span).join(', ')||'자료 없음'}입니다${r.dp?`. 합격 발표는 ${mdw(r.dp)}`:''}.`] as [string,string]),
      [`지금 접수 중인 ${C.name} 회차는?`,b.open.length?`${buildDay} 기준 ${b.open.map(e=>`${e.round.label} ${e.stage}(${mdw(e.e)}까지)`).join(', ')}입니다.`:`${buildDay} 기준 없습니다.${b.next?` 다음 접수는 ${b.next.round.label} ${b.next.stage} ${mdw(b.next.s)}부터입니다.`:''}`],
    ] as [string,string][])}/>
    <p className="muted small">출처: 한국산업인력공단 국가자격 시험일정 조회 서비스(공공데이터포털). 매일 갱신.</p>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['자격증 시험 일정',SITE+'/schedule'],[C.name,`${SITE}/schedule/${c}`]])}/>
  </div>;
}
