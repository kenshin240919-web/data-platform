import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor,linksNear} from '@guidejung/ui/network';
import {JangInfo} from '../../_components/JangInfo';
import {MarketCard} from '../../_components/Cards';
import {Ad} from '../../_components/Ad';
import {distKm,eun,fair,fairPath,fairs,jangDaysText,jangLabel,km,mapUrl,n,nearMarkets,ownFairs,SITE,sidoFull,sidoSlug,type Fair} from '../../../lib/data';

// 온누리 시장과 이어지지 않은 5일장만(이어진 곳은 /market/{id}#jang)
export const dynamicParams=false;
export function generateStaticParams(){return ownFairs.length?ownFairs.map(f=>({id:f.id})):[{id:'none'}];}
type P={params:Promise<{id:string}>};
const where=(f:Fair)=>f.region_name??(f.sido?sidoFull(f.sido):'');
export async function generateMetadata({params}:P):Promise<Metadata>{
  const f=fair((await params).id);if(!f||f.mid)return {};
  return {title:`${f.name} 장날 ${jangLabel(f)} · ${where(f)}`,
    description:`${where(f)} ${eun(f.name)} ${jangDaysText(f)}에 서는 ${jangLabel(f)}이에요. ${f.addr??f.jibun??''} 다음 장날·점포 수·취급 품목·주차장, 가까운 5일장.`.replace(/\s+/g,' ').slice(0,160),
    alternates:{canonical:`/jang/${f.id}`}};
}
export default async function FairPage({params}:P){
  const f=fair((await params).id);if(!f||f.mid)notFound();
  const pt=f.lat!=null&&f.lon!=null;
  const near=pt?fairs.filter(x=>x.id!==f.id&&x.lat!=null&&x.lon!=null).map(x=>({x,d:distKm(f.lat!,f.lon!,x.lat!,x.lon!)})).filter(o=>o.d<=30).sort((a,b)=>a.d-b.d).slice(0,8):[];
  const onnuri=pt?nearMarkets(f.lat!,f.lon!,5).slice(0,4):[];
  const facts:[string,string|null|undefined][]=[['장날',`${jangLabel(f)} (${jangDaysText(f)})`],['주소',f.addr],['지번 주소',f.jibun],['지역',where(f)],['시장 유형',f.mtype],
    ['점포 수',f.stores?`${n(+f.stores)}개`:null],['취급 품목',f.goods?.replace(/\+/g,', ')],['주차장',f.parking==null?null:f.parking?'있음':'없음'],['공중화장실',f.toilet==null?null:f.toilet?'있음':'없음'],['전화',f.tel],['개설',f.year?`${f.year}년`:null]];
  const ld={'@context':'https://schema.org','@type':'ShoppingCenter',name:f.name,url:`${SITE}/jang/${f.id}`,image:SITE+'/og.png?v=2',description:`${jangDaysText(f)}에 서는 ${jangLabel(f)}`,
    ...(f.addr||f.jibun?{address:{'@type':'PostalAddress',streetAddress:f.addr??f.jibun,...(f.sido?{addressRegion:sidoFull(f.sido)}:{}),addressCountry:'KR'}}:{}),
    ...(pt?{geo:{'@type':'GeoCoordinates',latitude:f.lat,longitude:f.lon}}:{}),...(f.tel?{telephone:f.tel}:{})};
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/jang">오늘 장날</Link>{f.region&&<> › <Link href={`/region/${f.region}`}>{f.region_name}</Link></>} › {f.name}</nav>
    <div className="mk-head"><h1>🧺 {f.name} 장날</h1><p>{where(f)} · {jangLabel(f)}{f.stores?` · 점포 ${n(+f.stores)}개`:''}</p></div>
    <div className="mk-actions"><a href={mapUrl({name:f.name,lat:f.lat,lon:f.lon,addr:f.addr??f.jibun})} target="_blank" rel="noopener">🧭 시장 길찾기</a>
      {f.tel&&<a className="sub" href={`tel:${f.tel.replace(/[^0-9]/g,'')}`}>📞 시장 전화</a>}
      <a className="naver" href={`https://map.naver.com/p/search/${encodeURIComponent(`${f.name} ${where(f).split(' ').slice(-1)[0]}`)}`} target="_blank" rel="noopener">🟢 네이버 지도에서 보기</a></div>
    <JangInfo f={f} name={f.name}/>
    <Ad/>
    <section><h2>시장 정보</h2><dl className="mk-facts">{facts.filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>
    {near.length>0&&<section><h2>가까운 다른 5일장</h2><div className="mk-cards">{near.map(({x,d})=><a key={x.id} className="mk-card" href={fairPath(x)}>
      <span className="mk-icon" aria-hidden="true">🧺</span><span className="mk-card-body"><b>{x.name}</b><small><span className="mk-km">{km(d)}</span>{x.region_name??''}</small></span>
      <span className="mk-card-n"><b>{jangLabel(x)}</b><small>장날</small></span></a>)}</div></section>}
    {onnuri.length>0&&<section><h2>가까운 온누리상품권 사용처</h2><div className="mk-cards">{onnuri.map(o=><MarketCard key={o.m.id} m={o.m} dist={o.km}/>)}</div></section>}
    <Faq title={`${f.name} 자주 묻는 질문`} items={([
      [`${f.name} 장날은 언제인가요?`,`${jangDaysText(f)}에 서는 ${jangLabel(f)}이에요.${f.days?.includes(21)&&f.days.includes(26)?' 31일에도 장이 서는지는 시장마다 달라요.':''} 명절·날씨에 따라 쉬거나 바뀔 수 있어요.`],
      [`${eun(f.name)} 어디에 있나요?`,f.addr||f.jibun?`${f.addr??f.jibun}에 있어요.`:''],
      [`${f.name}에 주차장이 있나요?`,f.parking==null?'':f.parking?'전국전통시장표준데이터에 주차장이 있다고 등록돼 있어요.':'전국전통시장표준데이터에 주차장이 없다고 등록돼 있어요. 가까운 공영주차장을 확인하세요.'],
      [`${f.name}에서 무엇을 파나요?`,f.goods?`${f.goods.replace(/\+/g,', ')} 등을 팔아요(등록 기준).`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect title="장 보러 가기 전에 확인하세요" items={pt?linksNear(f.lat!,f.lon!,'market'):genericFor('market')}/>
    <JsonLd data={ld}/>
    <JsonLd data={breadcrumbLd([['내근처 시장',SITE+'/'],['오늘 장 서는 5일장',SITE+'/jang'],[f.name,`${SITE}/jang/${f.id}`]])}/>
    <p className="muted small">출처: 전국전통시장표준데이터(공공데이터포털). 온누리상품권 공식 가맹점 목록에서는 이 시장 이름을 찾지 못했어요 — 가게마다 가맹 여부를 확인하세요. {f.sido&&<Link href={`/sido/${sidoSlug(f.sido)}`}>{sidoFull(f.sido)} 온누리상품권 사용처 →</Link>}</p>
  </div>;
}
