import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {BoxTable} from '../../_components/BoxTable';
import {Ad} from '../../_components/Ad';
import {SITE,n} from '../../../lib/data';
import {filmPath,rangeKo,weekend,weekly} from '../../../lib/kobis';

const KINDS={weekly:{label:'주간',span:'월~일',other:'weekend'},weekend:{label:'주말',span:'금~일',other:'weekly'}} as const;
type Kind=keyof typeof KINDS;
const list=(k:Kind)=>k==='weekly'?weekly:weekend;
export const dynamicParams=false;
export function generateStaticParams(){return (Object.keys(KINDS) as Kind[]).map(kind=>({kind}));}
type P={params:Promise<{kind:string}>};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const k=(await params).kind as Kind;if(!(k in KINDS))return {};
  const w=list(k)[0],t=w?.rows[0],K=KINDS[k];
  return {title:`${K.label} 박스오피스 순위${w?` ${rangeKo(w.range)}`:''} · ${K.label} 관객 수`,
    description:t?`${rangeKo(w!.range)} ${K.label}(${K.span}) 박스오피스 1위는 ${t.name}(${n(t.audi)}명, 누적 ${n(t.acc)}명). 영화진흥위원회 통합전산망 기준 ${K.label} 관객 수 순위 TOP 10과 지난 4주 1위.`:`영화진흥위원회 통합전산망 기준 ${K.label}(${K.span}) 박스오피스 순위.`,
    alternates:{canonical:`/boxoffice/${k}`}};
}
export default async function Page({params}:P){
  const k=(await params).kind as Kind;if(!(k in KINDS))notFound();
  const K=KINDS[k],ws=list(k),w=ws[0],t=w?.rows[0];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/boxoffice">박스오피스</Link> › {K.label}</nav>
    <h1>{k==='weekly'?'📅':'🍿'} {K.label} 박스오피스{w&&` · ${rangeKo(w.range)}`}</h1>
    {t?<p className="mv-answer">1위 <Link href={filmPath(t.cd)}><b>{t.name}</b></Link> · {K.label} {n(t.audi)}명 · 누적 <b>{n(t.acc)}명</b></p>
      :<p className="muted">{K.label} 순위를 아직 받지 못했어요. <Link href="/boxoffice">어제 박스오피스</Link>를 먼저 보세요.</p>}
    <div className="mv-jump"><Link href="/boxoffice">🏆 어제 순위</Link><Link href={`/boxoffice/${K.other}`}>{K.other==='weekly'?'📅 주간 순위':'🍿 주말 순위'}</Link><Link href="/film">🎞️ 상영 중인 영화</Link></div>
    {w&&<BoxTable rows={w.rows} title={<>{rangeKo(w.range)} {K.label} 관객 수 순위</>} note={`${K.span} 관객 수 합계`}/>}
    <Ad/>
    {ws.length>1&&<section><h2>지난 {ws.length}주 1위</h2>
      <table className="mv-feetable mv-wide"><thead><tr><th>기간</th><th>1위</th><th>관객</th></tr></thead><tbody>{ws.map(x=>x.rows[0]&&<tr key={x.end}><td>{rangeKo(x.range)}</td><td><Link href={filmPath(x.rows[0].cd)}>{x.rows[0].name}</Link></td><td>{n(x.rows[0].audi)}명</td></tr>)}</tbody></table></section>}
    {ws.slice(1).map(x=><BoxTable key={x.end} rows={x.rows} limit={5} title={<>{rangeKo(x.range)} TOP 5</>}/>)}
    <Faq items={([
      ...(t?[[`${K.label} 박스오피스 1위는?`,`${rangeKo(w!.range)} ${K.label} 1위는 ${t.name}입니다. 이 기간 관객 ${n(t.audi)}명, 개봉 뒤 누적 ${n(t.acc)}명입니다.`]] as [string,string][]:[]),
      [`${K.label} 박스오피스는 언제 나오나요?`,`${K.span} 관객 수를 더한 순위라 그 기간이 끝난 다음 날(월요일)부터 볼 수 있습니다.`],
      ['자료는 어디서 오나요?','영화진흥위원회 영화관입장권 통합전산망 오픈 API의 주간·주말 박스오피스입니다.'],
    ] as [string,string][])}/>
    <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],['박스오피스',SITE+'/boxoffice'],[`${K.label} 박스오피스`,`${SITE}/boxoffice/${k}`]])}/>
  </div>;
}
