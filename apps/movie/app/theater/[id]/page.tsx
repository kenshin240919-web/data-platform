import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {Actions} from '@guidejung/ui/favlist';
import {Showtimes} from '../../_components/Live';
import {TheaterCard} from '../../_components/TheaterList';
import {Ad} from '../../_components/Ad';
import {CHAINS,distKm,km,LIVE_CHAINS,meters,n,PARKING,region,SITE,slim,telHref,theater,theaterPath,theaters,updated,years} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return theaters.map(t=>({id:t.id}));}
type P={params:Promise<{id:string}>};
const kind=(t:NonNullable<ReturnType<typeof theater>>)=>t.drive?'자동차극장':t.chain==='indie'?'작은 영화관':CHAINS[t.chain].label;
export async function generateMetadata({params}:P):Promise<Metadata>{
  const t=theater((await params).id);if(!t)return {};
  const sp=t.special?.length?` 특별관 ${t.special.join('·')}.`:'';
  return {title:`${t.name} 오늘 상영 시간표·남은 좌석`,description:`${t.region_name} ${t.name}(${kind(t)}) 상영관 ${t.screens}개.${sp} 오늘 남은 상영 시간과 좌석, 주소·전화·가까운 공영주차장${t.park?`(${meters(t.park.m)})`:''}을 한 번에 확인하세요.`,alternates:{canonical:theaterPath(t.id)}};
}
export default async function TheaterPage({params}:P){
  const t=theater((await params).id);if(!t)notFound();
  const r=region(t.region);
  const others=t.lat!=null?theaters.filter(x=>x.id!==t.id&&x.lat!=null).map(x=>({...slim(x),km:Math.round(distKm(t.lat!,t.lon!,x.lat!,x.lon!)*100)/100})).filter(x=>x.km<=10).sort((a,b)=>a.km-b.km).slice(0,6):[];
  const y=years(t.since);const live=LIVE_CHAINS.includes(t.chain);
  const facts:[string,React.ReactNode][]=[['종류',kind(t)],['상영관',`${t.screens}개`+(t.special?.length?` (특별관 ${t.special.join('·')})`:'')],
    ['주소',t.addr??t.jibun??'-'],...(t.tel?[['전화',<a key="t" href={telHref(t.tel)}>{t.tel}</a>] as [string,React.ReactNode]]:[]),
    ...(t.since?[['등록',`${t.since}${y?` (${y}년째)`:''}`] as [string,React.ReactNode]]:[]),
    ...(t.park?[['가까운 공영주차장',<a key="p" href={`${PARKING}/parking/${t.park.id}`}>{t.park.name} {meters(t.park.m)}{t.park.free?' · 무료':''}{t.park.n>1?` (500m 안 ${t.park.n}곳)`:''}</a>] as [string,React.ReactNode]]:[])];
  const ld={'@context':'https://schema.org','@type':'MovieTheater',name:t.name,url:SITE+theaterPath(t.id),address:{'@type':'PostalAddress',streetAddress:t.addr??t.jibun??undefined,addressRegion:t.region_name.split(' ')[0],addressCountry:'KR'},
    ...(t.tel?{telephone:t.tel}:{}),...(t.lat!=null?{geo:{'@type':'GeoCoordinates',latitude:t.lat,longitude:t.lon}}:{}),screenCount:t.screens};
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › {r&&<><Link href={`/region/${r.id}`}>{r.name}</Link> › </>}{t.name}</nav>
    <h1>{t.name}</h1>
    <p className="muted">{t.region_name} · {kind(t)} · 상영관 {t.screens}개</p>
    <Actions fav={{id:`movie:${t.id}`,name:t.name,sub:t.region_name,url:SITE+theaterPath(t.id)}} go={t.lat!=null?{name:t.name,lat:t.lat,lon:t.lon!}:undefined}/>
    {/* 11/14 '이어서 보기'(다른 사이트와 같은 방식): 첫 화면에서 근처 같은 종류로 */}
    {others.length>0&&<nav className="gj-next" aria-label="이어서 보기"><span>근처 영화관</span>{others.slice(0,3).map(o=><Link key={o.id} href={theaterPath(o.id)}>{o.name}<small>{o.km<0.03?'같은 건물':km(o.km)}</small></Link>)}<Link className="all" href={`/region/${t.region}`}>{t.region_name.trim()} 전체 →</Link></nav>}
    <section><h2>🎬 오늘 남은 상영</h2>
      {live?<Showtimes id={t.id} name={t.name} chainLabel={CHAINS[t.chain].label}/>
        :<p className="mv-answer">{t.drive?'자동차극장은':'이 극장은'} 실시간 상영 시간을 받을 수 없어요. {t.tel?<>전화(<a href={telHref(t.tel)}>{t.tel}</a>)나 </>:''}<a href={`https://search.naver.com/search.naver?query=${encodeURIComponent(t.name+' 상영시간표')}`} target="_blank" rel="noopener">네이버에서 ‘{t.name} 상영시간표’</a>로 확인해 주세요.</p>}
    </section>
    <Ad/>
    <section><h2>극장 정보</h2><dl className="mv-facts">{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>
    {others.length>0&&<section><h2>근처 다른 극장 <small className="muted">10km 안</small></h2><div className="mv-cards">{others.map(o=><TheaterCard key={o.id} p={o}/>)}</div></section>}
    <Faq items={([
      [`${t.name} 상영관은 몇 개인가요?`,`지자체 등록 기준 상영관 ${t.screens}개입니다${t.special?.length?`(이름에 적힌 특별관: ${t.special.join(', ')})`:''}(${updated()} 기준).`],
      [`${t.name} 오늘 상영 시간은?`,live?`이 페이지 ‘오늘 남은 상영’에서 지금 이후 상영과 남은 좌석을 볼 수 있습니다(${CHAINS[t.chain].label} 앱 정보 기준 비공식 안내). 예매는 ${CHAINS[t.chain].label} 공식 앱·누리집에서 하세요.`:'실시간 상영 시간을 받을 수 없는 극장이라 전화나 극장 누리집에서 확인해야 합니다.'],
      [`${t.name} 근처 주차는?`,t.park?`가장 가까운 공영주차장은 ${t.park.name}(${meters(t.park.m)}${t.park.free?', 무료':''})입니다. 극장 자체 주차 할인은 극장에 확인하세요.`:''],
      [`${t.name} 근처 다른 영화관은?`,others.length?`10km 안에 ${others.slice(0,3).map(o=>`${o.name}(${o.km<1?Math.round(o.km*1000)+'m':o.km.toFixed(1)+'km'})`).join(', ')} 등이 있습니다.`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    {t.lat!=null&&<Connect items={linksNear(t.lat,t.lon!,'movie')}/>}
    <JsonLd data={ld}/>
    <JsonLd data={breadcrumbLd([['내근처 영화관',SITE+'/'],...(r?[[r.name,`${SITE}/region/${r.id}`] as [string,string]]:[]),[t.name,SITE+theaterPath(t.id)]])}/>
    <p className="muted small">극장 정보: 행정안전부 지방행정 인허가데이터(영화상영관, {updated()} 기준). <Link href="/data-policy">출처 안내</Link></p>
  </div>;
}
