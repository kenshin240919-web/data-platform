import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Ad} from '../_components/Ad';
import {LINKS,n,nation,SITE} from '../../lib/data';
import {allRounds,board,buildDay,byCat,CATS,cats,mdw,roundName,years} from '../../lib/scheduleData';
import {Board} from './Board';
const Y=years[0];
const b=board(allRounds,buildDay);
export const metadata:Metadata={title:`${Y} 자격증 시험 일정 — 기능사·기사·기능장·기술사 원서 접수·시험·발표`,
  description:`${Y}년 국가기술자격 시험 일정(한국산업인력공단): ${cats.map(c=>`${CATS[c].name} ${byCat(c).filter(r=>r.y===Y).length}회차`).join(', ')}. 지금 접수 중인 회차와 2주 안 접수·이번 주 시험·합격 발표를 날짜순으로.`,alternates:{canonical:'/schedule'}};
export default function SchedulePage(){
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 자격증 시험 일정</nav>
    <h1>📅 자격증 시험 일정</h1>
    <Board list={allRounds} build={buildDay}/>
    <section><h2>종류별 {Y}년 일정</h2><div className="jb-kinds">{cats.map(c=>{const l=byCat(c);const nx=board(l,buildDay).next;return <Link key={c} href={`/schedule/${c}`} className="jb-kindcard">
      <span aria-hidden="true">{CATS[c].icon}</span><span><b>{CATS[c].name}</b><small>{CATS[c].desc}{nx?` · 다음 접수 ${mdw(nx.s)}`:''}</small></span><em>{n(l.length)}회차</em></Link>;})}</div></section>
    <Ad/>
    <section className="jb-guide"><h2>시험 보기 전에</h2><ul>
      <li>여기 일정은 한국산업인력공단 <b>회차별 일정</b>이에요. 같은 회차라도 종목마다 시험이 없거나 날짜·시간이 다를 수 있으니, 내 종목은 <a href={LINKS.qnet} rel="noopener" target="_blank">큐넷</a>에서 확인하세요.</li>
      <li>원서는 큐넷에서 접수하고, 시험장은 접수할 때 골라요. 가까운 시험장은 <Link href="/exam">자격증 시험장</Link>({n(nation.kinds.exam)}곳)에서 볼 수 있어요.</li>
      <li>세무사·공인노무사 같은 <b>국가전문자격</b>은 공단 자료에 시험 이름이 없어 싣지 않았어요. 큐넷에서 확인하세요.</li>
    </ul></section>
    <div className="jb-jump"><Link href="/exam">📝 내 근처 자격증 시험장</Link><Link href="/calc">🧮 일자리 계산기</Link><Link href="/center">🏛️ 관할 고용센터</Link></div>
    <Faq items={([
      ['지금 원서 접수 중인 자격증 시험은?',b.open.length?`${buildDay} 기준 ${b.open.slice(0,4).map(e=>`${roundName(e.round)} ${e.stage}(${mdw(e.e)}까지)`).join(', ')}${b.open.length>4?' 등':''}입니다.`:`${buildDay} 기준 접수 중인 회차는 없습니다.${b.next?` 다음 접수는 ${roundName(b.next.round)} ${b.next.stage} ${mdw(b.next.s)}부터입니다.`:''}`],
      ...cats.slice(0,4).map(c=>{const l=byCat(c).filter(r=>r.y===Y);return [`${Y}년 ${CATS[c].name} 시험은 몇 번 있나요?`,`한국산업인력공단 일정에 ${l.length}회차가 올라와 있습니다. 회차별 접수·시험·발표 날짜는 ${CATS[c].name} 일정 페이지에서 볼 수 있습니다.`] as [string,string];}),
      ['자격증 시험장은 어떻게 정하나요?','원서를 접수할 때 시험장을 고르고, 시험 날에는 수험표에 적힌 시험장으로 갑니다.'],
    ] as [string,string][])}/>
    <p className="muted small">출처: 한국산업인력공단 국가자격 시험일정 조회 서비스(공공데이터포털). 매일 갱신.</p>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['자격증 시험 일정',SITE+'/schedule']])}/>
  </div>;
}
