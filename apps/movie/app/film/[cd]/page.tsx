import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Actions} from '@guidejung/ui/favlist';
import {FilmNear} from '../../_components/FilmNear';
import {Ad} from '../../_components/Ad';
import {SITE,n} from '../../../lib/data';
import {dot,film,filmList,filmPath,historyOf,KOBIS_SRC,lastRow,md,mdw,rangeKo,sortedFilms,updatedKo,weeksOf,type Film} from '../../../lib/kobis';

export const dynamicParams=false;
// 영화가 하나도 없을 때(로컬에 kobis.json 없음)도 빌드가 되게 자리표시 하나 — 페이지는 404
export function generateStaticParams(){return filmList.length?filmList.map(f=>({cd:f.cd})):[{cd:'_'}];}
type P={params:Promise<{cd:string}>};
const sub=(f:Film)=>[f.genres.join('·'),f.grade,f.runtime&&`${f.runtime}분`,f.open&&`${dot(f.open)} 개봉`].filter(Boolean).join(' · ');
export async function generateMetadata({params}:P):Promise<Metadata>{
  const f=film((await params).cd);if(!f)return {};
  const l=lastRow(f.cd);
  return {title:`${f.name} 누적 관객 수·박스오피스 순위·내 주변 상영시간표`,
    description:`${f.name}${f.en?`(${f.en})`:''} ${sub(f)}.${f.directors.length?` 감독 ${f.directors.slice(0,2).join('·')}.`:''}${f.actors.length?` 출연 ${f.actors.slice(0,3).map(a=>a.name).join('·')}.`:''}${l?` ${md(l.date)} ${l.r.rank}위, 누적 관객 ${n(l.r.acc)}명.`:''} 내 주변 극장 오늘 남은 상영도 함께.`,
    alternates:{canonical:filmPath(f.cd)}};
}
export default async function FilmPage({params}:P){
  const f=film((await params).cd);if(!f)notFound();
  const hist=historyOf(f.cd),l=hist[0],wk=weeksOf(f.cd,'weekly'),we=weeksOf(f.cd,'weekend');
  const best=hist.reduce<typeof l|undefined>((a,x)=>!a||x.r.rank<a.r.rank||(x.r.rank===a.r.rank&&x.r.audi>a.r.audi)?x:a,undefined);
  const peak=hist.reduce<typeof l|undefined>((a,x)=>!a||x.r.audi>a.r.audi?x:a,undefined);
  const facts:[string,string][]=([['장르',f.genres.join(', ')],['관람 등급',f.grade??''],['상영 시간',f.runtime?`${f.runtime}분`:''],['개봉',dot(f.open)],
    ['제작 국가',f.nations.join(', ')],['감독',f.directors.join(', ')],['출연',f.actors.slice(0,8).map(a=>a.name).join(', ')],['배급',f.dist.join(', ')],['제작 연도',f.year??'']] as [string,string][]).filter(([,v])=>v);
  const others=sortedFilms().filter(x=>x.f.cd!==f.cd).slice(0,6);
  const ld={'@context':'https://schema.org','@type':'Movie',name:f.name,...(f.en?{alternateName:f.en}:{}),url:SITE+filmPath(f.cd),
    ...(f.open&&/^\d{8}$/.test(f.open)?{datePublished:`${f.open.slice(0,4)}-${f.open.slice(4,6)}-${f.open.slice(6,8)}`}:{}),...(f.runtime?{duration:`PT${f.runtime}M`}:{}),
    ...(f.genres.length?{genre:f.genres}:{}),...(f.grade?{contentRating:f.grade}:{}),
    ...(f.directors.length?{director:f.directors.map(name=>({'@type':'Person',name}))}:{}),...(f.actors.length?{actor:f.actors.slice(0,8).map(a=>({'@type':'Person',name:a.name}))}:{}),
    ...(f.nations.length?{countryOfOrigin:f.nations.map(name=>({'@type':'Country',name}))}:{}),...(f.dist.length?{productionCompany:f.dist.map(name=>({'@type':'Organization',name}))}:{})};
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/film">상영 중인 영화</Link> › {f.name}</nav>
    <h1>{f.name}</h1>
    <p className="muted">{f.en&&<>{f.en} · </>}{sub(f)}</p>
    <Actions fav={{id:`movie:film:${f.cd}`,name:f.name,sub:'영화',url:SITE+filmPath(f.cd)}}/>
    {l&&<p className="mv-answer">📊 {mdw(l.date)} 박스오피스 <b>{l.r.rank}위</b> · 하루 {n(l.r.audi)}명 · 누적 관객 <b>{n(l.r.acc)}명</b> · 스크린 {n(l.r.scrn)}개</p>}
    <FilmNear name={f.name}/>
    <Ad/>
    {hist.length>0&&<section className="mv-box"><h2>📈 날짜별 박스오피스</h2>
      <table className="mv-feetable mv-wide"><thead><tr><th>날짜</th><th>순위</th><th>관객</th><th>누적</th></tr></thead>
        <tbody>{hist.map(x=><tr key={x.date}><td>{mdw(x.date)}</td><td><b>{x.r.rank}위</b>{x.r.new?' NEW':''}</td><td>{n(x.r.audi)}명</td><td>{n(x.r.acc)}명</td></tr>)}</tbody></table>
      {(wk.length>0||we.length>0)&&<ul className="mv-weeks">{wk.map(x=><li key={'w'+x.range}>주간 {rangeKo(x.range)} <b>{x.r.rank}위</b> {n(x.r.audi)}명</li>)}{we.map(x=><li key={'e'+x.range}>주말 {rangeKo(x.range)} <b>{x.r.rank}위</b> {n(x.r.audi)}명</li>)}</ul>}
      <p className="muted small">출처: {KOBIS_SRC}(일별·주간·주말 박스오피스 — 최근 2주 가운데 10위 안에 든 {hist.length}일)</p></section>}
    <section className="mv-box"><h2>🎞️ 영화 정보</h2><dl className="mv-facts">{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {f.actors.some(a=>a.cast)&&<p className="muted small">배역: {f.actors.filter(a=>a.cast).slice(0,6).map(a=>`${a.name}(${a.cast})`).join(', ')}</p>}
      <p className="muted small">출처: {KOBIS_SRC}(영화 상세정보, {updatedKo()} 확인)</p></section>
    {others.length>0&&<section><h2>요즘 함께 보는 영화</h2><ol className="mv-rank">{others.map(({f:o,last})=><li key={o.cd}><Link href={filmPath(o.cd)}><b>{o.name}</b><span>{last?`${last.r.rank}위 · 누적 ${n(last.r.acc)}명`:o.genres[0]??''}</span></Link></li>)}</ol>
      <p><Link href="/boxoffice">박스오피스 전체 보기 →</Link></p></section>}
    <Faq items={([
      [`${f.name} 누적 관객 수는?`,l?`${md(l.date)}까지 누적 ${n(l.r.acc)}명입니다(${KOBIS_SRC} 기준).`:''],
      [`${f.name} 박스오피스 순위는?`,l?`${md(l.date)} ${l.r.rank}위(하루 ${n(l.r.audi)}명)입니다.${best&&best!==l?` 최근 2주 중 가장 높은 순위는 ${md(best.date)} ${best.r.rank}위입니다.`:''}${peak&&peak.r.audi>l.r.audi?` 하루 관객이 가장 많았던 날은 ${md(peak.date)}(${n(peak.r.audi)}명)입니다.`:''}`:''],
      [`${f.name} 상영 시간은 얼마나 되나요?`,f.runtime?`${f.runtime}분입니다${f.grade?`(관람 등급 ${f.grade})`:''}.`:''],
      [`${f.name} 감독과 출연 배우는?`,f.directors.length||f.actors.length?`${f.directors.length?`감독 ${f.directors.join(', ')}`:''}${f.directors.length&&f.actors.length?', ':''}${f.actors.length?`출연 ${f.actors.slice(0,5).map(a=>a.name).join(', ')}`:''}입니다.`:''],
      [`${f.name} 어디서 볼 수 있나요?`,'이 페이지 ‘내 주변 오늘 상영’에서 가까운 CGV·롯데시네마·메가박스의 오늘 남은 상영과 남은 좌석을 볼 수 있습니다(극장 앱 정보 기준 비공식 안내). 예매는 극장 공식 앱·누리집에서 하세요.'],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <JsonLd data={ld}/>
    <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],['상영 중인 영화',SITE+'/film'],[f.name,SITE+filmPath(f.cd)]])}/>
  </div>;
}
