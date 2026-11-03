import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearJob} from '../_components/NearJob';
import {Ad} from '../_components/Ad';
import {Official} from '../_components/Guide';
import {centers,COND_MIN,eun,ga,KIND_ORDER,KINDS,LINKS,n,nation,places,placePath,regionName,regions,sidos,SITE,SUBS,updated,type Kind,type Sub} from '../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return KIND_ORDER.map(kind=>({kind}));}
type P={params:Promise<{kind:string}>};
const META:Record<Kind,[string,string]>={
  center:['내 관할 고용센터(고용복지플러스센터)','실업급여·국민취업지원제도는 주민등록 주소지 관할 고용센터에서. 시군구별 관할 고용복지플러스센터와 주소·대표전화.'],
  agency:['내 주변 직업소개소·인력사무소','지자체에 등록된 유료직업소개소를 가까운 순으로. 인력·건설 일용직, 간병·요양, 가사·산후 도우미 소개소.'],
  free:['내 주변 무료직업소개소','지자체·공공기관·단체가 수수료 없이 운영하는 직업소개소를 가까운 순으로.'],
  women:['내 주변 여성새로일하기센터(새일센터)','경력이 끊긴 여성의 구직 상담·직업교육·인턴을 하는 새일센터 위치와 연락처.'],
  senior:['내 주변 노인일자리 기관(시니어클럽·노인복지관)','노인일자리 사업을 하는 수행기관을 가까운 순으로. 공고는 노인일자리 여기에서.'],
  campus:['대학일자리플러스센터','대학 안에서 진로·취업 상담을 하는 대학일자리플러스센터와 관할 고용센터.'],
  exam:['내 근처 자격증 시험장(국가자격 시험장)','한국산업인력공단 국가자격 시험장을 가까운 순으로. 대학교·고등학교·상설 시험장의 주소와 시험실.'],
};
export async function generateMetadata({params}:P):Promise<Metadata>{
  const k=(await params).kind as Kind;if(!KINDS[k])return {};
  return {title:`${META[k][0]} ${n(nation.kinds[k])}곳`,description:`${META[k][1]} (${updated()} 기준 ${n(nation.kinds[k])}곳)`,alternates:{canonical:`/${k}`}};
}
export default async function KindHome({params}:P){
  const k=(await params).kind as Kind;if(!KINDS[k])notFound();
  const items=places.filter(p=>p.kind===k);
  const top=[...regions].filter(r=>r.kinds[k]>=COND_MIN).sort((a,b)=>b.kinds[k]-a.kinds[k]).slice(0,12);
  const all=k==='center'||k==='women'||k==='campus'||k==='exam'?sidos.map(s=>({name:s.name,items:items.filter(p=>s.regions.some(r=>r.id===p.region))})).filter(s=>s.items.length):[];
  const subs=k==='agency'?(Object.keys(SUBS) as Sub[]).map(s=>({s,items:items.filter(p=>p.sub===s)})).filter(x=>x.items.length):[];
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › {KINDS[k].label}</nav>
    <h1>{KINDS[k].icon} {META[k][0]}</h1>
    <p className="jb-answer">전국 {eun(KINDS[k].title)} <b>{n(items.length)}곳</b>이에요. <span className="muted">({updated()} 기준)</span></p>
    <NearJob kind={k}/>
    <div className="jb-jump">{KIND_ORDER.filter(o=>o!==k).map(o=><Link key={o} href={`/${o}`}>{KINDS[o].icon} {KINDS[o].label} <small>{n(nation.kinds[o])}</small></Link>)}</div>
    <Ad/>
    {k==='center'&&<section><h2>시군구별 관할 고용센터</h2><p className="muted small">실업급여·국민취업지원제도는 주민등록 주소지를 관할하는 센터에서 신청해요. 관할은 고용노동부 현황의 ‘관할구역’ 그대로예요.</p>
      {sidos.map(s=>{const cs=centers.filter(c=>s.regions.some(r=>r.id===c.region));return cs.length?<details key={s.name} open={s.name==='서울'}><summary><b>{s.name}</b> <span className="muted">{n(cs.length)}곳</span></summary>
        <table className="jb-table"><tbody>{cs.map(c=><tr key={c.id}><th><a href={placePath(c.id)}>{c.name}</a></th><td>{c.juris_text??(c.juris??[]).map(regionName).join(', ')}{c.tel?<span className="muted"> · {c.tel}</span>:null}{c.hp?<> · <a className="hp" href={c.hp} rel="noopener" target="_blank">🏠 홈페이지 ↗</a></>:null}</td></tr>)}</tbody></table></details>:null;})}</section>}
    {subs.map(({s,items:l})=><section key={s} id={s}><h2>{SUBS[s]} 소개소 <span className="muted">{n(l.length)}곳</span></h2><p className="muted small">이름에 ‘{s==='labor'?'인력·용역·건설':s==='care'?'간병·요양':s==='home'?'가사·파출·산후·도우미':s==='search'?'서치·헤드헌팅':'외국인·해외'}’ 같은 낱말이 든 곳이에요. 많은 지역:</p>
      <div className="jb-jump">{[...regions].map(r=>({r,c:l.filter(p=>p.region===r.id).length})).filter(x=>x.c>=COND_MIN).sort((a,b)=>b.c-a.c).slice(0,10).map(({r,c})=><Link key={r.id} href={`/region/${r.id}/agency`}>{r.name} <small>{n(c)}</small></Link>)}</div></section>)}
    {top.length>0&&<section><h2>{KINDS[k].label} 많은 지역</h2><ol className="jb-rank">{top.map(r=><li key={r.id}><Link href={`/region/${r.id}/${k}`}><b>{r.name}</b><span>{n(r.kinds[k])}곳</span></Link></li>)}</ol></section>}
    {k!=='center'&&all.map(s=><section key={s.name}><h2>{s.name} <span className="muted">{n(s.items.length)}곳</span></h2><ul className="jb-plain">{s.items.map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> <span className="muted">· {p.region_name}</span></li>)}</ul></section>)}
    {k==='agency'&&<section className="jb-guide"><h2>직업소개소 이용 전에</h2><ul>
      <li>여기 나온 곳은 지자체에 <b>등록·신고된 직업소개소</b>예요(행정안전부 인허가 정보, 영업 중인 곳만).</li>
      <li>유료직업소개소는 구직자에게 <b>선급금을 받을 수 없어요</b>(직업안정법 제21조의2). 소개 요금은 고용노동부가 정한 기준을 따라야 해요.</li>
      <li>일을 시작하기 전에 일하는 시간·임금이 적힌 근로계약서를 받으세요. 건설 현장은 건설업 기초안전보건교육 이수증이 필요해요.</li>
    </ul></section>}
    {k==='exam'&&<section className="jb-guide"><h2>시험 보러 가기 전에</h2><ul>
      <li>국가기술자격 시험장은 원서를 접수할 때 고르고, 시험 날에는 수험표에 적힌 시험장으로 가요. 종목·회차마다 쓰는 시험장이 달라요. 내 시험장은 <a href={LINKS.qnet} rel="noopener" target="_blank">큐넷</a>의 수험표에서 확인하세요.</li>
      <li>여기 나온 곳은 한국산업인력공단이 등록한 시험장 전체예요(교도소 안 시험장은 뺐어요). 같은 주소의 시험실은 한 곳으로 묶었어요.</li>
      <li>주차가 되는지는 시험장마다 달라요. 수험표 안내를 먼저 보고, 어려우면 근처 공영주차장을 찾아 두세요.</li>
    </ul><p><a className="jb-more-link" href={LINKS.qnet} rel="noopener" target="_blank">큐넷에서 시험 일정·원서 접수 ↗</a></p></section>}
    <Official/>
    <Faq items={[[`${eun(KINDS[k].title)} 몇 곳인가요?`,`${updated()} 기준 전국 ${n(items.length)}곳입니다.`],
      ...(top[0]?[[`${ga(KINDS[k].label)} 가장 많은 지역은?`,`${top.slice(0,3).map(r=>`${r.name} ${n(r.kinds[k])}곳`).join(', ')} 순입니다.`] as [string,string]]:[]),
      ...(k==='exam'?[['자격증 시험장은 어떻게 정해지나요?','국가기술자격 시험장은 원서를 접수할 때 고르고, 시험 날에는 수험표에 적힌 시험장으로 가요. 종목·회차마다 쓰는 시험장이 달라요. 내 시험장은 큐넷 수험표에서 확인하세요.'] as [string,string]]:[]),
      ...(k==='center'?[['실업급여는 어느 고용센터에서 신청하나요?','주민등록 주소지를 관할하는 고용센터에서 신청합니다. 위 표에서 내 시군구의 관할 센터를 확인하세요.'] as [string,string]]:[])]}/>
    <JsonLd data={breadcrumbLd([['내근처 일자리',SITE+'/'],[KINDS[k].label,`${SITE}/${k}`]])}/>
  </div>;
}
