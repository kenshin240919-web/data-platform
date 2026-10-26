import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearRest} from '../_components/NearRest';
import {Ad} from '../_components/Ad';
import {KindGuide,PriceNote} from '../_components/Guide';
import {eun,ga,COND_MIN,KIND_ORDER,KINDS,n,nation,places,regions,shopPath,sidos,SITE,subsOf,updated,type Kind} from '../../lib/data';

// 전국 종류별 페이지(/sauna·/private·/anma·/skin): 내 주변 + 많은 지역. 1인·프라이빗은 수가 적어 전국 목록을 정적 HTML에 모두 넣음.
export const dynamicParams=false;
export function generateStaticParams(){return KIND_ORDER.map(kind=>({kind}));}
type P={params:Promise<{kind:string}>};
const META:Record<Kind,[string,string]>={
  sauna:['내 주변 찜질방·사우나·목욕탕','전국 찜질방·사우나·대중목욕탕·한증막을 가까운 순으로. 지자체에 신고된 곳만, 위치·전화·영업 햇수.'],
  private:['1인 목욕탕·프라이빗 사우나·세신샵','혼자 또는 일행끼리 쓰는 1인 목욕탕·프라이빗 사우나·세신샵을 가까운 순으로. 지자체에 신고된 곳만.'],
  anma:['내 주변 안마원·안마시술소(마사지)','시각장애인 안마사가 개설해 신고한 안마원·안마시술소를 가까운 순으로. 마사지 받을 곳을 등록 업소로 찾으세요.'],
  skin:['내 주변 피부관리실','피부미용업으로 신고된 피부관리실·왁싱·속눈썹 업소를 가까운 순으로. 위치·전화·영업 햇수.'],
};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const k=(await params).kind as Kind;if(!KINDS[k])return {};
  return {title:`${META[k][0]} ${n(nation.kinds[k])}곳`,description:`${META[k][1]} (${updated()} 기준 ${n(nation.kinds[k])}곳)`,alternates:{canonical:`/${k}`}};
}
export default async function KindHome({params}:P){
  const k=(await params).kind as Kind;if(!KINDS[k])notFound();
  const items=places.filter(p=>p.kind===k),subs=subsOf(items);
  const top=[...regions].filter(r=>r.kinds[k]>=COND_MIN).sort((a,b)=>b.kinds[k]-a.kinds[k]).slice(0,12);
  const bySido=k==='private'?sidos.map(s=>({name:s.name,items:items.filter(p=>s.regions.some(r=>r.id===p.region))})).filter(s=>s.items.length):[];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › {KINDS[k].label}</nav>
    <h1>{KINDS[k].icon} {META[k][0]}</h1>
    <p className="rs-answer">지자체에 영업 중으로 신고된 {eun(KINDS[k].title)} 전국 <b>{n(items.length)}곳</b>이에요{subs.length>1?` (${subs.slice(0,5).map(([s,v])=>`${s} ${n(v)}`).join(' · ')})`:''}. <span className="muted">({updated()} 기준)</span></p>
    <NearRest kind={k}/>
    <div className="rs-jump">{KIND_ORDER.filter(o=>o!==k).map(o=><Link key={o} href={`/${o}`}>{KINDS[o].icon} {KINDS[o].label} <small>{n(nation.kinds[o])}</small></Link>)}</div>
    <Ad/>
    {top.length>0&&<section><h2>{KINDS[k].label} 많은 지역</h2><ol className="rs-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/${k}`}><b>{r.name}</b><span>{n(r.kinds[k])}곳</span></Link></li>)}</ol></section>}
    {bySido.map(s=><section key={s.name}><h2>{s.name} <span className="muted">{n(s.items.length)}곳</span></h2><ul className="rs-plain">{s.items.map(p=><li key={p.id}><a href={shopPath(p.id)}>{p.name}</a> <span className="muted">· {p.region_name}{p.sub?` · ${p.sub}`:''}</span></li>)}</ul></section>)}
    <PriceNote/>
    <KindGuide/>
    <Faq items={[[`${eun(KINDS[k].title)} 몇 곳인가요?`,`${updated()} 기준 지자체에 영업 중으로 신고된 ${eun(KINDS[k].title)} 전국 ${n(items.length)}곳입니다.`],
      ...(top[0]?[[`${ga(KINDS[k].label)} 가장 많은 지역은?`,`${top.slice(0,3).map(r=>`${r.name} ${n(r.kinds[k])}곳`).join(', ')} 순입니다.`] as [string,string]]:[])]}/>
    <JsonLd data={breadcrumbLd([['내근처 휴식',SITE+'/'],[KINDS[k].label,`${SITE}/${k}`]])}/>
  </div>;
}
