import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {BoxOffice} from '../_components/Live';
import {BoxTable} from '../_components/BoxTable';
import {Ad} from '../_components/Ad';
import {SITE,n} from '../../lib/data';
import {daily,filmPath,films,hasKobis,latest,md,mdw,rangeKo,weekend,weekly} from '../../lib/kobis';

const top=latest?.rows[0];
export const metadata:Metadata={title:latest?`박스오피스 순위 ${md(latest.date)} · 어제 영화 관객 수 · 누적 관객`:'박스오피스 순위 · 어제 영화 관객 수 · 누적 관객',
  description:top?`${mdw(latest!.date)} 박스오피스 1위는 ${top.name}(${n(top.audi)}명, 누적 ${n(top.acc)}명). 영화진흥위원회 통합전산망 기준 일별 관객 수 순위 TOP 10과 지난 2주 1위, 주간·주말 순위.`:'영화진흥위원회 통합전산망 기준 어제 하루 관객 수 순위(박스오피스)와 누적 관객 수.',
  alternates:{canonical:'/boxoffice'}};

export default function Page(){
  // 지난 2주 1위(날짜별) — 같은 영화가 이어지면 한 줄
  const leaders=daily.map(d=>({date:d.date,r:d.rows[0]})).filter(x=>x.r);
  return <div className="page">
  <nav className="crumbs"><Link href="/">홈</Link> › 박스오피스</nav>
  <h1>🏆 {latest?`${mdw(latest.date)} 박스오피스`:'어제 박스오피스'}</h1>
  {top?<p className="mv-answer">1위 <Link href={filmPath(top.cd)}><b>{top.name}</b></Link> · 하루 {n(top.audi)}명 · 누적 <b>{n(top.acc)}명</b>{latest!.rows[1]&&<> / 2위 {latest!.rows[1].name} {n(latest!.rows[1].audi)}명</>}</p>
    :<p className="muted">어제 하루 관객 수 순위예요.</p>}
  <div className="mv-jump"><Link href="/boxoffice/weekly">📅 주간 순위</Link><Link href="/boxoffice/weekend">🍿 주말 순위</Link><Link href="/film">🎞️ 상영 중인 영화</Link><Link href="/">📍 내 주변 극장</Link></div>
  {hasKobis?<BoxTable rows={latest!.rows} title={<>📊 {md(latest!.date)} 관객 수 순위</>} note="매일 아침 새로 받아요"/>:<BoxOffice limit={10}/>}
  <Ad/>
  {leaders.length>1&&<section><h2>지난 {leaders.length}일 1위</h2>
    <table className="mv-feetable mv-wide"><thead><tr><th>날짜</th><th>1위</th><th>관객</th></tr></thead><tbody>{leaders.map(x=><tr key={x.date}><td>{mdw(x.date)}</td><td>{films[x.r.cd]?<Link href={filmPath(x.r.cd)}>{x.r.name}</Link>:x.r.name}</td><td>{n(x.r.audi)}명</td></tr>)}</tbody></table></section>}
  {weekly[0]&&<p><Link href="/boxoffice/weekly">지난주({rangeKo(weekly[0].range)}) 주간 1위는 <b>{weekly[0].rows[0]?.name}</b> →</Link></p>}
  {weekend[0]&&<p><Link href="/boxoffice/weekend">지난 주말({rangeKo(weekend[0].range)}) 1위는 <b>{weekend[0].rows[0]?.name}</b> →</Link></p>}
  <section className="mv-guide"><h2>박스오피스 읽는 법</h2><ol>
    <li><b>순위는 하루 관객 수</b><span>영화관입장권 통합전산망에 집계된 그날 관객 수 기준이에요.</span></li>
    <li><b>▲▼는 그 전날과 비교한 순위 변화</b><span>NEW는 이날 처음 순위에 든 영화예요.</span></li>
    <li><b>누적 관객 수</b><span>개봉한 날부터 그날까지 모인 관객 수예요.</span></li>
  </ol></section>
  <Faq items={([
    ['박스오피스는 어디 자료인가요?','영화진흥위원회 영화관입장권 통합전산망 오픈 API의 일별·주간·주말 박스오피스입니다. 매일 아침 새로 받아 보여 드립니다.'],
    ...(top?[[`${md(latest!.date)} 박스오피스 1위는?`,`${top.name}입니다. 이날 관객 ${n(top.audi)}명, 개봉 뒤 누적 ${n(top.acc)}명입니다.`]] as [string,string][]:[]),
    ['오늘 박스오피스는 왜 없나요?','통합전산망 일별 박스오피스는 하루가 끝난 뒤 집계돼 어제 순위까지 볼 수 있습니다.'],
    ['박스오피스 순위는 무엇으로 정하나요?','하루 동안 영화관에서 표를 끊고 본 관객 수가 많은 순서입니다. 누적 관객 수는 개봉일부터 그날까지 모두 더한 수입니다.'],
    ['주말 박스오피스는 어디서 보나요?','주말 순위(금~일)는 ‘주말 순위’, 월~일 한 주 순위는 ‘주간 순위’ 페이지에서 볼 수 있습니다.'],
    ['보고 싶은 영화를 어디서 볼 수 있나요?','첫 화면의 내 주변 영화관에서 극장마다 오늘 남은 상영 시간과 남은 좌석을 확인할 수 있습니다. 영화 이름을 누르면 그 영화의 내 주변 상영도 볼 수 있습니다.'],
  ] as [string,string][])}/>
  <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],['박스오피스',SITE+'/boxoffice']])}/>
</div>;}
