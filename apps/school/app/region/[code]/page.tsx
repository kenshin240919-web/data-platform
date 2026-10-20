import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {AdSlot} from '@guidejung/ui/ads';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,linksNear} from '@guidejung/ui/network';
import {KIND_ICON,KIND_LABEL,KIND_ORDER,n,region,regions,schoolPath,SITE,updated} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return regions.map(r=>({code:r.id}));}
type P={params:Promise<{code:string}>};
const kindsLine=(k:Record<string,number>)=>KIND_ORDER.filter(x=>k[x]).map(x=>`${KIND_LABEL[x]} ${n(k[x])}곳`).join('·');
export async function generateMetadata({params}:P):Promise<Metadata>{
  const r=region((await params).code);if(!r)return {};
  return {title:`${r.name} 학교 ${n(r.count)}곳 · 급식·학사일정`,description:`${r.name} ${kindsLine(r.kinds)}. 학교를 골라 오늘 급식·이번 주 급식·학사일정 D-day·시간표를 확인하세요.`,alternates:{canonical:`/region/${r.id}`}};
}
export default async function RegionPage({params}:P){
  const r=region((await params).code);if(!r)notFound();
  const groups=KIND_ORDER.map(k=>[k,r.schools.filter(s=>s.k===k)] as const).filter(([,l])=>l.length);
  const big=[...r.schools].filter(s=>s.k==='high').slice(0,3);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › <Link href="/region">지역별 학교</Link> › {r.name}</nav>
    <h1>{r.name} 학교</h1>
    <p className="sc-answer"><b>{r.name}</b>에는 {kindsLine(r.kinds)}, 모두 <b>{n(r.count)}곳</b>이 있어요. 학교를 누르면 오늘 급식이 바로 보여요. <span className="muted">({updated()} 기준)</span></p>
    <div className="sc-jump">{groups.map(([k,l])=><a key={k} href={`#${k}`}>{KIND_ICON[k]} {KIND_LABEL[k]} <small>{n(l.length)}</small></a>)}</div>
    {groups.map(([k,l],i)=><section key={k} id={k}><h2>{KIND_ICON[k]} {r.name} {KIND_LABEL[k]} <span className="muted">{n(l.length)}곳</span></h2>
      <ul className="sc-school-list">{l.map(s=><li key={s.code}><a href={schoolPath(s.code)}><b>{s.name}</b><small>{[s.found,s.coedu!=='남여공학'?s.coedu:null,s.address?.split(' ').slice(2,4).join(' ')].filter(Boolean).join(' · ')}</small></a></li>)}</ul>
      {i===0&&<AdSlot/>}</section>)}
    <Faq items={[
      [`${r.name}에 학교는 몇 곳인가요?`,`${updated()} 기준 ${r.name}에는 ${kindsLine(r.kinds)}, 모두 ${n(r.count)}곳이 있습니다.`],
      [`${r.name} 학교 급식 메뉴는 어디서 보나요?`,`학교 이름을 누르면 나이스에 올라온 오늘 급식과 이번 주 급식(알레르기 표시)을 볼 수 있습니다${big.length?`. 예: ${big.map(s=>s.name).join(', ')}`:''}.`],
    ]}/>
    {r.lat!=null&&<Connect items={linksNear(r.lat,r.lon!,'school')}/>}
    <JsonLd data={breadcrumbLd([['내 학교',SITE+'/'],['지역별 학교',SITE+'/region'],[r.name,`${SITE}/region/${r.id}`]])}/>
  </div>;
}
