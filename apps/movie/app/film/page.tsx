import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Ad} from '../_components/Ad';
import {SITE,n} from '../../lib/data';
import {dot,filmPath,KOBIS_SRC,latest,md,sortedFilms} from '../../lib/kobis';

const all=sortedFilms();
export const metadata:Metadata={title:'요즘 상영 중인 영화 · 누적 관객 수·순위',
  description:`최근 2주 박스오피스에 든 영화 ${n(all.length)}편의 순위·누적 관객 수·장르·관람 등급·상영 시간. 영화를 고르면 내 주변 극장의 오늘 남은 상영을 볼 수 있어요.`,alternates:{canonical:'/film'}};
export default function Page(){
  const now=all.filter(x=>x.last?.date===latest?.date),past=all.filter(x=>x.last?.date!==latest?.date);
  const Item=({x}:{x:typeof all[number]})=><li><Link href={filmPath(x.f.cd)}><b>{x.f.name}</b>
    <span>{x.last?`${x.last.date===latest?.date?`${x.last.r.rank}위`:`${md(x.last.date)}까지`} · 누적 ${n(x.last.r.acc)}명`:''}</span></Link>
    <small className="muted">{[x.f.genres.join('·'),x.f.grade,x.f.runtime&&`${x.f.runtime}분`,x.f.open&&`${dot(x.f.open)} 개봉`].filter(Boolean).join(' · ')}</small></li>;
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 상영 중인 영화</nav>
    <h1>🎞️ 요즘 상영 중인 영화</h1>
    <p className="muted">최근 2주 박스오피스에 든 영화예요. 영화를 누르면 누적 관객 수와 내 주변 극장의 오늘 남은 상영을 볼 수 있어요.</p>
    {now.length>0&&<section><h2>{latest&&md(latest.date)} 순위에 든 영화 {now.length}편</h2><ol className="mv-rank mv-films">{now.map(x=><Item key={x.f.cd} x={x}/>)}</ol></section>}
    <Ad/>
    {past.length>0&&<section><h2>최근 2주 순위에 들었던 영화</h2><ol className="mv-rank mv-films">{past.map(x=><Item key={x.f.cd} x={x}/>)}</ol></section>}
    <p className="muted small">출처: {KOBIS_SRC}(일별·주간·주말 박스오피스, 영화 상세정보)</p>
    <Faq items={[
      ['여기 나온 영화는 어떻게 고르나요?','영화진흥위원회 통합전산망 일별·주간·주말 박스오피스(각 10위 안)에 최근 2주 안에 든 영화입니다. 순위에서 빠진 지 오래된 영화는 목록에서 내려갑니다.'],
      ['내 주변에서 이 영화를 하는 극장은?','영화 페이지의 ‘내 주변 오늘 상영’에서 가까운 CGV·롯데시네마·메가박스 4곳의 오늘 남은 상영을 볼 수 있습니다.'],
    ]}/>
    <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],['상영 중인 영화',SITE+'/film']])}/>
  </div>;
}
