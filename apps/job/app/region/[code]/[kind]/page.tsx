import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {PlaceList} from '../../../_components/PlaceList';
import {Ad} from '../../../_components/Ad';
import {Connect,linksNear} from '@guidejung/ui/network';
import {centerFor,COND_MIN,distKm,eun,KIND_ORDER,KINDS,n,ordered,placePath,region,regions,SITE,slim,updated,type Kind,type Region} from '../../../../lib/data';
// 종류별로 이어 볼 안내(상황별 안내·계산기·시험 일정) — 다음 검색으로 이 페이지에 들어온 사람이 한 번 더 누를 거리(11/12 GA: 일자리 첫 페이지가 지역×종류)
const NEXT:Record<Kind,[string,string][]>={
  center:[['/guide#quit','😮‍💨 일을 그만뒀을 때 순서'],['/calc/unemployment','💰 실업급여 계산기'],['/calc/severance','🧾 퇴직금 계산기']],
  agency:[['/guide#today','🔨 오늘 일당 일자리 찾는 순서'],['/calc/wage','⏱️ 시급·주휴수당 계산기'],['/calc/insurance','📑 4대보험 계산기']],
  free:[['/guide#today','🔨 오늘 일당 일자리 찾는 순서'],['/calc/wage','⏱️ 시급·주휴수당 계산기']],
  women:[['/guide#women','👩 다시 일하고 싶을 때(경력단절) 순서'],['/calc/wage','⏱️ 시급·주휴수당 계산기']],
  senior:[['/guide#senior','👴 어르신 일자리 찾는 순서'],['/calc/wage','⏱️ 시급·주휴수당 계산기']],
  campus:[['/guide#youth','🎓 청년·대학생 취업 순서'],['/calc/yearend','🧮 연말정산 계산기']],
  exam:[['/schedule','📅 자격증 시험 일정'],['/exam','📝 전국 시험장']],
};
/** 중심이 가까운 다른 시군구 중 같은 종류가 COND_MIN곳 이상인 곳. */
const nearRegions=(r:Region,k:Kind,max=8)=>regions.filter(o=>o.id!==r.id&&o.kinds[k]>=COND_MIN&&o.lat&&r.lat).map(o=>({o,km:distKm(r.lat,r.lon,o.lat,o.lon)})).filter(x=>x.km<=40).sort((a,b)=>a.km-b.km).slice(0,max);
export const dynamicParams=false;
export function generateStaticParams(){return regions.flatMap(r=>KIND_ORDER.filter(k=>r.kinds[k]>=COND_MIN).map(k=>({code:r.id,kind:k})));}
type P={params:Promise<{code:string;kind:string}>};
const get=async(params:P['params'])=>{const {code,kind}=await params;const r=region(code);const k=kind as Kind;return r&&KINDS[k]?{r,k,items:ordered(r.items.filter(p=>p.kind===k))}:null;};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const x=await get(params);if(!x)return {};
  return {title:`${x.r.name} ${KINDS[x.k].title} ${n(x.items.length)}곳`,description:`${x.r.name} ${KINDS[x.k].title} ${n(x.items.length)}곳: ${x.items.slice(0,5).map(p=>p.name).join(', ')}${x.items.length>5?' 등':''}. 주소·전화를 확인하세요.`,alternates:{canonical:`/region/${x.r.id}/${x.k}`}};
}
export default async function KindPage({params}:P){
  const x=await get(params);if(!x||x.items.length<COND_MIN)notFound();
  const {r,k,items}=x;const c=centerFor(r);const near=nearRegions(r,k);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별</Link> › <Link href={`/region/${r.id}`}>{r.name}</Link> › {KINDS[k].label}</nav>
    <h1>{r.name} {KINDS[k].title}</h1>
    <p className="jb-answer"><b>{r.name}</b> {eun(KINDS[k].title)} <b>{n(items.length)}곳</b>이에요. <span className="muted">({updated()} 기준)</span></p>
    <div className="jb-jump">{KIND_ORDER.filter(o=>o!==k&&r.kinds[o]>=COND_MIN).map(o=><Link key={o} href={`/region/${r.id}/${o}`}>{KINDS[o].icon} {r.zone} {KINDS[o].label} <small>{n(r.kinds[o])}</small></Link>)}<Link href={`/region/${r.id}`}>{r.zone} 전체 <small>{n(r.count)}</small></Link></div>
    {k!=='center'&&k!=='exam'&&c.list.slice(0,1).map(x=><a key={x.id} className="jb-juris" href={placePath(x.id)}><span aria-hidden="true">🏛️</span><span><small>{r.name} {c.exact?'관할 고용센터':'에서 가까운 고용센터(관할은 센터에 확인)'}</small><b>{x.name}</b><small>{x.addr}{x.tel?` · ${x.tel}`:''}</small></span><em>실업급여·구직 신청 →</em></a>)}
    <section><h2>{r.name} {KINDS[k].label} 목록</h2><PlaceList items={items.map(slim)} kind={k}/>
      <noscript><ul>{items.slice(0,300).map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> · {p.addr}</li>)}</ul></noscript></section>
    <Ad/>
    <section><h2>함께 보면 좋은 안내</h2><div className="jb-jump">{NEXT[k].map(([h,t])=><Link key={h} href={h}>{t}</Link>)}</div></section>
    {near.length>0&&<section><h2>가까운 지역 {KINDS[k].label}</h2><p className="muted small">{r.name}에서 가까운 시군구 순서예요(지역 중심 사이 직선거리).</p>
      <div className="jb-jump">{near.map(({o,km})=><Link key={o.id} href={`/region/${o.id}/${k}`}>{o.name} <small>{n(o.kinds[k])}곳 · {Math.round(km)}km</small></Link>)}</div></section>}
    <Faq items={([
      [`${r.name} ${eun(KINDS[k].title)} 몇 곳인가요?`,`${updated()} 기준 ${n(items.length)}곳입니다: ${items.slice(0,5).map(p=>p.name).join(', ')}${items.length>5?' 등':''}.`],
      [`${r.name} 관할 고용센터는 어디인가요?`,k!=='exam'&&c.list.length?`${c.exact?'관할':'가까운'} 고용센터는 ${c.list.map(x=>`${x.name}(${x.addr??''})`).join(', ')}입니다.${c.exact?'':' 관할은 센터에 확인하세요.'}`:''],
      [`${r.name} 근처 다른 지역 ${eun(KINDS[k].label)} 어디 있나요?`,near.length?`가까운 순으로 ${near.slice(0,4).map(({o})=>`${o.name} ${n(o.kinds[k])}곳`).join(', ')}이 있습니다.`:''],
    ] as [string,string][]).filter(([,a])=>a)}/>
    <Connect items={linksNear(r.lat,r.lon,'job')}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],['지역별',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`],[KINDS[k].label,`${SITE}/region/${r.id}/${k}`]])}/>
  </div>;
}
