import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearPet} from '../_components/NearPet';
import {NearAnimals} from '../_components/Animals';
import {Ad} from '../_components/Ad';
import {HoursNote,KindGuide,SickGuide} from '../_components/Guide';
import {eun,ga,COND_MIN,KIND_ORDER,KINDS,n,nation,places,regions,placePath,sidos,SITE,subsOf,updated,type Kind} from '../../lib/data';

// 전국 종류별 페이지(/hospital·/pharmacy·/hotel·/cafe·/taxi): 내 주변 + 많은 지역. 카페는 수가 적어 전국 목록을 정적 HTML에 모두 넣음.
export const dynamicParams=false;
export function generateStaticParams(){return KIND_ORDER.map(kind=>({kind}));}
type P={params:Promise<{kind:string}>};
const META:Record<Kind,[string,string]>={
  hospital:['내 주변 동물병원','전국 동물병원을 가까운 순으로. 지자체에 신고된 곳만, 위치·전화·개설 햇수와 24시 동물병원(이름 기준).'],
  shelter:['내 주변 동물보호센터','지자체가 지정한 유실·유기동물 보호센터를 가까운 순으로. 운영 시간·전화와 지금 보호 중인 아이들.'],
  pharmacy:['지금 문 연 동물약국','동물용 의약품을 파는 동물약국을 가까운 순으로. 약국 영업 시간으로 지금 영업 중인 곳부터 보여 드려요.'],
  hotel:['내 주변 펫호텔·애견 유치원','동물위탁관리업으로 등록한 펫호텔·애견 유치원을 가까운 순으로. 위치·전화·등록 햇수.'],
  cafe:['애견 카페·고양이 카페','동물전시업으로 등록한 애견 카페·고양이 카페와 동물 체험 시설을 가까운 순으로.'],
  taxi:['내 주변 펫택시','동물운송업으로 등록한 펫택시·반려동물 운송 업체를 가까운 순으로. 동물병원 갈 때 차가 없다면.'],
};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const k=(await params).kind as Kind;if(!KINDS[k])return {};
  return {title:`${META[k][0]} ${n(nation.kinds[k])}곳`,description:`${META[k][1]} (${updated()} 기준 ${n(nation.kinds[k])}곳)`,alternates:{canonical:`/${k}`}};
}
export default async function KindHome({params}:P){
  const k=(await params).kind as Kind;if(!KINDS[k])notFound();
  const items=places.filter(p=>p.kind===k),subs=subsOf(items);
  const top=[...regions].filter(r=>r.kinds[k]>=COND_MIN).sort((a,b)=>b.kinds[k]-a.kinds[k]).slice(0,12);
  const bySido=k==='cafe'||k==='shelter'?sidos.map(s=>({name:s.name,items:items.filter(p=>s.regions.some(r=>r.id===p.region))})).filter(s=>s.items.length):[];
  const withHours=items.filter(p=>p.hours).length;
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › {KINDS[k].label}</nav>
    <h1>{KINDS[k].icon} {META[k][0]}</h1>
    <p className="pt-answer">지자체에 영업 중으로 신고된 {eun(KINDS[k].title)} 전국 <b>{n(items.length)}곳</b>이에요{subs.length>1?` (${subs.slice(0,5).map(([s,v])=>`${s} ${n(v)}`).join(' · ')})`:''}{k==='pharmacy'?`. 이 중 ${n(withHours)}곳은 영업 시간으로 지금 문 열었는지 보여 드려요`:''}. <span className="muted">({updated()} 기준)</span></p>
    <NearPet kind={k}/>
    <div className="pt-jump">{k!=='hospital'&&<Link href="/24h">🚨 24시 동물병원 <small>{n(nation.h24)}</small></Link>}{KIND_ORDER.filter(o=>o!==k).map(o=><Link key={o} href={`/${o}`}>{KINDS[o].icon} {KINDS[o].label} <small>{n(nation.kinds[o])}</small></Link>)}</div>
    <Ad/>
    {k==='hospital'&&<SickGuide/>}
    {k==='shelter'&&<NearAnimals/>}
    {top.length>0&&<section><h2>{KINDS[k].label} 많은 지역</h2><ol className="pt-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/${k}`}><b>{r.name}</b><span>{n(r.kinds[k])}곳</span></Link></li>)}</ol></section>}
    {bySido.map(s=><section key={s.name}><h2>{s.name} <span className="muted">{n(s.items.length)}곳</span></h2><ul className="pt-plain">{s.items.map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> <span className="muted">· {p.region_name}{p.sub?` · ${p.sub}`:''}</span></li>)}</ul></section>)}
    {(k==='hospital'||k==='pharmacy')&&<HoursNote/>}
    <KindGuide/>
    <Faq items={[[`${eun(KINDS[k].title)} 몇 곳인가요?`,`${updated()} 기준 지자체에 영업 중으로 신고된 ${eun(KINDS[k].title)} 전국 ${n(items.length)}곳입니다.`],
      ...(top[0]?[[`${ga(KINDS[k].label)} 가장 많은 지역은?`,`${top.slice(0,3).map(r=>`${r.name} ${n(r.kinds[k])}곳`).join(', ')} 순입니다.`] as [string,string]]:[]),
      ...(k==='pharmacy'?[['동물약국에서 사람 약도 파나요?','동물약국은 대부분 동네 약국이 동물용 의약품 판매를 함께 신고한 곳이라 사람 약도 함께 팝니다. 약국마다 다르니 전화로 확인하세요.'] as [string,string]]:[])]}/>
    <JsonLd data={breadcrumbLd([['내근처 동물병원',SITE+'/'],[KINDS[k].label,`${SITE}/${k}`]])}/>
  </div>;
}
