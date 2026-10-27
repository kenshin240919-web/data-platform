import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AREAS} from '@guidejung/ui/network';
import {AdSlot} from '@guidejung/ui/ads';
import {Actions} from '@guidejung/ui/favlist';
import {Faq,JsonLd,breadcrumbLd} from '@guidejung/ui/seo';
import {SituationLive} from '../../_components/SituationLive';
import {Dday} from '../../_components/Dday';
import {SEASONS,season} from '../../../lib/seasons';
import {sunrise} from '../../../lib/sun';
import {SITE} from '../../../lib/site';

export function generateStaticParams(){return SEASONS.map(s=>({slug:s.slug}));}
type P={params:Promise<{slug:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const s=season((await params).slug);if(!s)return {};
  return {title:s.h1,description:s.desc,alternates:{canonical:`/season/${s.slug}`},openGraph:{title:`${s.h1} | 내근처`,description:s.desc,url:`${SITE}/season/${s.slug}`}};
}
// 새해 해돋이 표: 해돋이로 알려진 바닷가 지역과 시도 대표 지역(시군구 중심 좌표 계산값). 일반구가 있는 시는 첫 구.
const SUN_AREAS=['강원 강릉시','경북 포항시','울산 울주군','부산 해운대구','제주 서귀포시','전남광주 여수시','강원 속초시','경북 울릉군','서울 중구','인천 제물포구','대전 중구','대구 중구','전남광주 동구','세종시','충북 청주시','충남 태안군','전북 전주시','경남 창원시','경기 수원시'];
const STEPS_TITLE:Record<string,string>={suneung:'수능날 당일 안내',foliage:'단풍 구경, 순서대로','winter-car':'겨울 점검, 순서대로','new-year':'해돋이 준비, 순서대로'};

export default async function Page({params}:P){
  const s=season((await params).slug);if(!s)notFound();
  const others=SEASONS.filter(x=>x.slug!==s.slug);
  const sun=s.slug==='new-year'&&s.date?SUN_AREAS.map(n=>AREAS.find(a=>a.n===n||a.n.startsWith(n+' '))).filter((a):a is (typeof AREAS)[number]=>!!a)
    .map(a=>({n:a.n,t:sunrise(a.lat,a.lon,s.date!.iso)})).sort((x,y)=>x.t.localeCompare(y.t)):[];
  const faq:[string,string][]=sun.length?[['2027년 1월 1일 가장 먼저 해가 뜨는 곳은?',`이 페이지의 계산값(지역 중심 좌표 기준)으로는 ${sun[0].n}이 ${sun[0].t}로 가장 빠릅니다. 정확한 시각은 한국천문연구원에서 확인하세요.`],...s.faq]:s.faq;
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › {s.title}</nav>
    <section className="nr-hero small"><h1>{s.icon} {s.h1}</h1><p>{s.lead}</p></section>
    {s.date&&<Dday iso={s.date.iso} label={s.date.label}/>}
    <Actions/>
    {s.facts.length>0&&<section><h2>{s.slug==='foliage'?'산별 단풍 절정 예상일 (산림청 예측)':`${s.title} 한눈에`}</h2><table className="nr-table"><tbody>{s.facts.map(([k,v])=><tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody></table></section>}
    {sun.length>0&&<section><h2>2027년 1월 1일 해 뜨는 시각 (계산값)</h2><table className="nr-table"><thead><tr><th>지역</th><th>해 뜨는 시각</th></tr></thead><tbody>{sun.map(r=><tr key={r.n}><td>{r.n}</td><td><b>{r.t}</b></td></tr>)}</tbody></table>
      <p className="muted small">지역(시군구) 중심 좌표로 계산한 값이에요. 바닷가·산 정상은 몇 분 다를 수 있어요.</p></section>}
    <SituationLive kind={s.slug} areas={AREAS} day={s.date?.iso}/>
    <section><h2>{STEPS_TITLE[s.slug]}</h2><ol className="nr-steps">{s.steps.map(([h,t])=><li key={h}><b>{h}</b><p>{t}</p></li>)}</ol>
      {s.notes.map(t=><p key={t} className="muted small">※ {t}</p>)}
      {s.source&&<p className="muted small">출처: {s.source.map(([t,u],i)=><span key={u}>{i?' · ':''}<a href={u} rel="noopener" target="_blank">{t}</a></span>)}</p>}</section>
    <AdSlot/>
    <section><h2>더 자세히 보기</h2><div className="nr-sites">{s.links.map(([i,t,h])=><a key={h} href={h} className="nr-site"><span aria-hidden="true">{i}</span><span><b>{t}</b><small>{h.replace('https://','').replace(/\?.*/,'')}</small></span></a>)}</div></section>
    <Faq items={faq} title={`${s.title} 자주 묻는 질문`}/>
    <section><h2>다른 시기 안내</h2><div className="nr-situations">{others.map(o=><Link key={o.slug} href={`/season/${o.slug}`} className="nr-situation"><span aria-hidden="true">{o.icon}</span><b>{o.title}</b><small>{o.lead}</small></Link>)}</div></section>
    <JsonLd data={breadcrumbLd([['내근처',`${SITE}/`],[s.title,`${SITE}/season/${s.slug}`]])}/>
    {s.slug==='suneung'&&<JsonLd data={{'@context':'https://schema.org','@type':'Event',name:'2027학년도 대학수학능력시험',startDate:'2026-11-19T08:40:00+09:00',endDate:'2026-11-19T17:45:00+09:00',eventStatus:'https://schema.org/EventScheduled',eventAttendanceMode:'https://schema.org/OfflineEventAttendanceMode',location:{'@type':'Place',name:'전국 1,312개 시험장',address:{'@type':'PostalAddress',addressCountry:'KR'}},organizer:{'@type':'Organization',name:'한국교육과정평가원',url:'https://www.kice.re.kr'},description:s.desc}}/>}
  </div>;
}
