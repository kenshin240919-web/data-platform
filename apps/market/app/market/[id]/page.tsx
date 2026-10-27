import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor,linksNear} from '@guidejung/ui/network';
import {MarketCard} from '../../_components/Cards';
import {StoreTable,type Row} from '../../_components/StoreTable';
import {Ad} from '../../_components/Ad';
import {baseLabel,CATS,eun,exact,isMarket,located,mapUrl,market,marketPath,markets,n,nearMarkets,pct,SITE,sidoFull,sidoSlug,status,storesOf,topCats,type Market} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return markets.map(m=>({id:m.id}));}
type P={params:Promise<{id:string}>};
const where=(m:Market)=>m.region_name??sidoFull(m.sido);
export async function generateMetadata({params}:P):Promise<Metadata>{
  const m=market((await params).id);if(!m)return {};
  const top=topCats(m.cats,3).map(c=>CATS[c].label).join('·');
  return {title:`${m.name} 온누리상품권 사용처 가맹점 ${n(m.n)}곳`,
    description:`${where(m)} ${m.name} 온누리상품권 가맹점 ${n(m.n)}곳(디지털 ${pct(m.d,m.n)}%)${top?` — ${top}`:''}. ${m.addr??m.jibun??''} ${baseLabel(status.base)} 공식 가맹점 목록 기준.`.replace(/\s+/g,' ').trim().slice(0,160),
    alternates:{canonical:marketPath(m.id)}};
}
export default async function MarketPage({params}:P){
  const m=market((await params).id);if(!m)notFound();
  const rows:Row[]=storesOf(m).map(s=>({id:s[0],name:s[1],cat:s[3],item:s[4],d:s[5],y:s[6]})).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  const top=topCats(m.cats,4);
  const loc=located(m),pin=exact(m);
  const near=loc?nearMarkets(m.lat!,m.lon!,5,m.id).slice(0,6):[];
  const kind=isMarket(m)?'전통시장':'상점가';
  const s=m.std;
  const facts:[string,string|null|undefined][]=[['주소',m.addr],['지번 주소',m.jibun],['지역',where(m)],['시장 유형',s?.mtype],['장 서는 날',s?.cycle],['점포 수',s?.stores?`${s.stores}개(전통시장 표준데이터)`:null],
    ['취급 품목',s?.goods],['주차장',s?.parking==null?null:s.parking?'있음':'없음'],['공중화장실',s?.toilet==null?null:s.toilet?'있음':'없음'],['전화',s?.tel],['개설',s?.year?`${s.year}년`:null],
    ['온누리 가맹점',`${n(m.n)}곳 (디지털도 되는 곳 ${n(m.d)}곳 · ${pct(m.d,m.n)}%)`],['새로 가맹',m.new?`${status.latest_year}년 ${n(m.new)}곳`:null]];
  const lead=`${eun(m.name)} ${where(m)}에 있는 ${kind}${kind==="전통시장"?"으로":"로"}, 온누리상품권 가맹점이 ${n(m.n)}곳 등록돼 있어요.${top.length?` 가장 많은 품목은 ${top.map(c=>`${CATS[c].label} ${n(m.cats[c]!)}곳`).join(', ')}이에요.`:''} 이 중 ${n(m.d)}곳(${pct(m.d,m.n)}%)은 디지털(모바일·카드) 온누리상품권도 받고, ${n(m.n-m.d)}곳은 지류(종이)형만 받아요.${m.new?` ${status.latest_year}년에 새로 가맹한 곳은 ${n(m.new)}곳이에요.`:''}`;
  const ld={'@context':'https://schema.org','@type':'ShoppingCenter',name:m.name,url:SITE+marketPath(m.id),image:SITE+'/og.png?v=2',
    ...(m.addr||m.jibun?{address:{'@type':'PostalAddress',streetAddress:m.addr??m.jibun,addressRegion:sidoFull(m.sido),addressCountry:'KR'}}:{}),
    ...(pin?{geo:{'@type':'GeoCoordinates',latitude:m.lat,longitude:m.lon}}:{}),...(s?.tel?{telephone:s.tel}:{}),paymentAccepted:'온누리상품권'};
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href={`/sido/${sidoSlug(m.sido)}`}>{sidoFull(m.sido)}</Link>{m.region&&<> › <Link href={`/region/${m.region}`}>{m.region_name}</Link></>} › {m.name}</nav>
    <div className="mk-head"><h1>🏪 {m.name} 온누리상품권 사용처</h1><p>{where(m)} · {kind} · 가맹점 {n(m.n)}곳</p></div>
    <p className="mk-answer">✅ 온누리상품권 가맹점 <b>{n(m.n)}곳</b> · 📱 디지털도 되는 곳 <b>{n(m.d)}곳</b>{m.new>0&&<> · 🆕 {status.latest_year}년 새로 가맹 {n(m.new)}곳</>}</p>
    <div className="mk-actions">{<a href={mapUrl({name:m.name,lat:pin?m.lat:null,lon:pin?m.lon:null,addr:m.addr??`${sidoFull(m.sido)} ${m.name}`})} target="_blank" rel="noopener">🧭 시장 길찾기</a>}
      {s?.tel&&<a className="sub" href={`tel:${s.tel.replace(/[^0-9]/g,'')}`}>📞 시장 전화</a>}
      <a className="naver" href={`https://map.naver.com/p/search/${encodeURIComponent(`${m.name} ${where(m).split(' ').slice(-1)[0]}`)}`} target="_blank" rel="noopener">🟢 네이버 지도에서 보기</a></div>
    <p className="mk-lead">{lead}</p>
    <section><h2>가맹점 목록 <span className="muted">{n(m.n)}곳</span></h2><StoreTable rows={rows} latest={status.latest_year}/></section>
    <Ad/>
    <section><h2>시장 정보</h2><dl className="mk-facts">{facts.filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      {m.geo==='kakao'&&<p className="muted small">위치는 카카오 지도 검색으로 찾은 곳이에요.</p>}{m.geo==='dong'&&<p className="muted small">정확한 위치를 찾지 못해 {m.jibun} 중심을 기준으로 보여 드려요(대략).</p>}{m.geo==='area'&&<p className="muted small">정확한 위치를 찾지 못해 {m.region_name} 기준으로 보여 드려요.</p>}</section>
    {near.length>0&&<section><h2>가까운 다른 시장·상점가</h2><div className="mk-cards">{near.map(x=><MarketCard key={x.m.id} m={x.m} dist={x.km}/>)}</div></section>}
    {m.region&&<p><Link className="mk-more-link" href={`/region/${m.region}`}>{m.region_name} 온누리상품권 사용처 모두 보기 →</Link></p>}
    <Faq title={`${m.name} 자주 묻는 질문`} items={([
      [`${m.name}에서 온누리상품권을 쓸 수 있나요?`,`네. ${baseLabel(status.base)} 기준 ${m.name}에는 온누리상품권 가맹점이 ${n(m.n)}곳 있어요. 모든 가게가 가맹한 것은 아니니 가게 입구의 가맹점 표시를 확인하세요.`],
      [`${m.name}에서 디지털 온누리상품권도 되나요?`,`가맹점 ${n(m.n)}곳 중 ${n(m.d)}곳(${pct(m.d,m.n)}%)이 디지털형(모바일·카드)도 가맹했어요. 가게 목록에서 ‘디지털 되는 곳’을 누르면 그 가게만 보여요.`],
      [`${m.name}에는 어떤 가게가 있나요?`,top.length?`온누리 가맹점 기준 ${top.map(c=>`${CATS[c].label} ${n(m.cats[c]!)}곳`).join(', ')} 등이 있어요.`:''],
      [`${eun(m.name)} 어디에 있나요?`,m.addr||m.jibun?`${m.addr??m.jibun}에 있어요.${s?.parking?' 주차장이 있어요.':''}`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect title="시장 가기 전에 확인하세요" items={loc?linksNear(m.lat!,m.lon!,'market'):genericFor('market')}/>
    <JsonLd data={ld}/>
    <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/'],[sidoFull(m.sido),`${SITE}/sido/${sidoSlug(m.sido)}`],...(m.region?[[m.region_name!,`${SITE}/region/${m.region}`] as [string,string]]:[]),[m.name,SITE+marketPath(m.id)]])}/>
    <p className="muted small">출처: 소상공인시장진흥공단 「전국 온누리상품권 가맹점 현황」({baseLabel(status.base)} 기준){s?', 전국전통시장표준데이터':''}. 가맹 여부는 바뀔 수 있어요.</p>
  </div>;
}
