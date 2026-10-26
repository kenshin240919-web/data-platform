import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {AnimalGrid,NearAnimals} from '../_components/Animals';
import {Ad} from '../_components/Ad';
import {ANIMAL_SITE,animals,animalsUpdated,daysLeft,n,nation,sidos,SITE,animalsIn} from '../../lib/data';

// 보호소에서 새 가족·원래 보호자를 기다리는 구조동물(보호 중). 정적 HTML에는 공고 마감이 가까운 24마리 + 시도별 수.
const soon=animals.filter(a=>{const d=daysLeft(a.until);return d!=null&&d>=0&&d<=3;});
export const metadata:Metadata={title:`보호소에서 기다리는 아이들 ${n(animals.length)}마리 · 유기동물 입양`,description:`전국 동물보호센터에서 보호 중인 구조동물 ${n(animals.length)}마리(개·고양이). 내 주변 보호소부터, 공고 마감이 가까운 아이 먼저 보여 드려요. (${animalsUpdated()} 기준, 농림축산검역본부)`,alternates:{canonical:'/adopt'}};
export default function Adopt(){
  const ups=animals.reduce((m,a)=>(m[a.up??'기타']=(m[a.up??'기타']??0)+1,m),{} as Record<string,number>);
  const bySido=sidos.map(s=>({name:s.name,count:s.regions.reduce((x,r)=>x+animalsIn(r.id).length,0)})).filter(s=>s.count).sort((a,b)=>b.count-a.count);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 보호 중인 아이들</nav>
    <h1>🐾 보호소에서 기다리는 아이들</h1>
    <p className="pt-answer">전국 동물보호센터에서 지금 보호 중인 아이 <b>{n(animals.length)}마리</b>({Object.entries(ups).map(([k,v])=>`${k} ${n(v)}`).join(' · ')}){soon.length>0&&<> · 공고 마감 3일 안 <b>{n(soon.length)}마리</b></>}. <span className="muted">({animalsUpdated()} 기준)</span></p>
    <NearAnimals/>
    <Ad/>
    {soon.length>0&&<section><h2>⏰ 공고 마감이 가까운 아이들</h2><AnimalGrid items={soon.slice(0,24)}/></section>}
    <section className="pt-guide"><h2>💬 입양·보호자 찾기는 이렇게</h2><ol>
      <li><b>보호소에 먼저 전화하세요</b><span>공고 기간과 입양 가능 여부, 방문 시간을 확인하세요. 우리 아이를 잃어버렸다면 특징과 잃어버린 곳을 말하세요.</span></li>
      <li><b>공고 기간이 지나면</b><span>원래 보호자가 나타나지 않으면 지자체 절차에 따라 입양 등을 할 수 있어요. 자세한 절차는 보호소와 <a href={ANIMAL_SITE} target="_blank" rel="noopener">국가동물보호정보시스템</a>에서 확인하세요.</span></li>
      <li><b>정보는 하루 한 번 갱신돼요</b><span>그사이 입양되거나 보호자를 찾았을 수 있으니 꼭 보호소에 확인하세요.</span></li>
    </ol></section>
    {bySido.length>0&&<section><h2>시도별 보호 중</h2><div className="pt-sidos">{bySido.map(s=><Link key={s.name} href={`/region#${s.name}`}><b>{s.name}</b><span>{n(s.count)}마리</span></Link>)}</div></section>}
    <p><Link className="pt-more-link" href="/shelter">동물보호센터 {n(nation.kinds.shelter)}곳 보기 →</Link> · <Link className="pt-more-link" href="/lost">최근 실종 동물 →</Link></p>
    <Faq items={[['지금 보호 중인 유기동물은 몇 마리인가요?',`${animalsUpdated()} 기준 전국 동물보호센터에서 보호 중인 구조동물은 ${n(animals.length)}마리입니다(농림축산검역본부 국가동물보호정보시스템).`],
      ['보호소 동물은 어떻게 입양하나요?','보호소에 전화해 입양 가능 여부와 방문 시간을 확인하세요. 공고 기간 안에는 원래 보호자를 먼저 기다립니다.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 동물병원',SITE+'/'],['보호 중인 아이들',`${SITE}/adopt`]])}/>
  </div>;
}
