import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor} from '@guidejung/ui/network';
import {JangToday} from '../_components/Jang';
import {Ad} from '../_components/Ad';
import {fairPath,fairs,jangGroups,n,SIDOS,SITE} from '../../lib/data';

const top5=jangGroups.filter(g=>/^\d+·\d+일장$/.test(g.label));
export const metadata:Metadata={title:'오늘 장 서는 5일장 — 전국 장날 달력',
  description:`오늘 장이 서는 5일장을 내 주변부터 보여 드려요. 전국 ${n(fairs.length)}곳 — ${top5.map(g=>`${g.label} ${n(g.fairs.length)}곳`).join(', ')}. 전국전통시장표준데이터 기준 장날·주소·주차장.`.slice(0,160),
  alternates:{canonical:'/jang'}};
const bySido=(fs:typeof fairs)=>SIDOS.map(([s])=>[s,fs.filter(f=>f.sido===s)] as const).filter(([,v])=>v.length);
export default function JangPage(){
  const sidoCount=SIDOS.map(([s,,full])=>[full,fairs.filter(f=>f.sido===s).length] as const).filter(([,c])=>c).sort((a,b)=>b[1]-a[1]);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 오늘 장날</nav>
    <h1>🧺 오늘 장 서는 5일장</h1>
    <p className="mk-lead">전국 전통시장 중 장 서는 날이 정해진 시장 <b>{n(fairs.length)}곳</b>의 장날을 모았어요. {top5.map(g=>`${g.label} ${n(g.fairs.length)}곳`).join(', ')}이에요. 날짜를 누르면 그날 장이 서는 시장을 가까운 순으로 보여 드려요.</p>
    <JangToday full/>
    <Ad/>
    <section className="mk-jang-groups"><h2>장날별 전국 5일장</h2>
      {jangGroups.map(g=><details key={g.label} open={g.fairs.length<=60}><summary className="mk-more-link">{g.label} <span className="muted">{n(g.fairs.length)}곳</span></summary>
        {bySido(g.fairs).map(([s,fs])=><div key={s}><h3>{SIDOS.find(x=>x[0]===s)![2]}</h3>
          <ul className="mk-jang-list">{fs.map(f=><li key={f.id}><a href={fairPath(f)}>{f.name}</a><small>{(f.region_name??'').split(' ').slice(1).join(' ')}</small></li>)}</ul></div>)}
      </details>)}</section>
    <Faq title="5일장 자주 묻는 질문" items={[
      ['5일장은 언제 서나요?','5일마다 날짜 끝자리로 서요. 예를 들어 2·7일장은 매달 2·7·12·17·22·27일, 5·10일장은 5·10·15·20·25·30일에 서요. 31일에 장이 서는지는 시장마다 달라요.'],
      ['오늘 장 서는 시장은 어디인가요?','이 페이지 맨 위에서 오늘 날짜에 장이 서는 시장을 보여 드려요. 위치를 허용하면 가까운 순으로, 날짜 칩을 누르면 내일·모레 장날도 볼 수 있어요.'],
      ['5일장이 가장 많은 지역은?',`전국전통시장표준데이터 기준 ${sidoCount.slice(0,3).map(([s,c])=>`${s} ${n(c)}곳`).join(', ')} 순이에요.`],
      ['장날 정보는 정확한가요?','지자체가 등록한 전국전통시장표준데이터의 개설 주기를 그대로 보여 드려요. 명절·날씨·시장 사정으로 쉬거나 바뀔 수 있으니 멀리서 가신다면 시장에 미리 확인하세요.'],
    ]}/>
    <Connect items={genericFor('market')}/>
    <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/'],['오늘 장 서는 5일장',SITE+'/jang']])}/>
    <p className="muted small">출처: 전국전통시장표준데이터(공공데이터포털) 시장 개설 주기. 날짜는 한국 시간 기준이에요.</p>
  </div>;
}
