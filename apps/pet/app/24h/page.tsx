import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {NearPet} from '../_components/NearPet';
import {Ad} from '../_components/Ad';
import {HoursNote,SickGuide} from '../_components/Guide';
import {is24,n,places,placePath,sidos,SITE,updated} from '../../lib/data';

// 24시 동물병원(이름에 '24'가 든 동물병원) 전국 목록 — 수가 적어 시도별로 정적 HTML에 모두 넣음(밤에 검색해 들어오는 페이지).
const items=places.filter(is24);
export const metadata:Metadata={title:`24시 동물병원 ${n(items.length)}곳 · 내 주변 야간·주말 동물병원`,description:`전국 24시 동물병원 ${n(items.length)}곳(병원 이름 기준)을 가까운 순으로. 밤·주말·공휴일에 우리 아이가 아플 때 가기 전에 전화로 진료 여부를 확인하세요. (${updated()} 기준)`,alternates:{canonical:'/24h'}};
export default function H24(){
  const bySido=sidos.map(s=>({name:s.name,items:items.filter(p=>s.regions.some(r=>r.id===p.region))})).filter(s=>s.items.length);
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › 24시 동물병원</nav>
    <h1>🚨 24시 동물병원</h1>
    <p className="pt-answer">이름에 ‘24’가 들어간 동물병원 전국 <b>{n(items.length)}곳</b>이에요({bySido.slice(0,4).map(s=>`${s.name} ${n(s.items.length)}`).join(' · ')} …). 공공데이터에 진료 시간이 없어 이름으로 모았으니, <b>가기 전에 꼭 전화로 확인</b>하세요. <span className="muted">({updated()} 기준)</span></p>
    <NearPet kind="hospital"/>
    <Ad/>
    <SickGuide/>
    {bySido.map(s=><section key={s.name}><h2>{s.name} 24시 동물병원 <span className="muted">{n(s.items.length)}곳</span></h2><ul className="pt-plain">{s.items.map(p=><li key={p.id}><a href={placePath(p.id)}>{p.name}</a> <span className="muted">· {p.region_name}{p.tel?` · ${p.tel}`:''}</span></li>)}</ul></section>)}
    <HoursNote/>
    <Faq items={[['24시 동물병원은 몇 곳인가요?',`${updated()} 기준 이름에 ‘24’가 들어간 동물병원은 전국 ${n(items.length)}곳입니다.`],
      ['24시 동물병원은 정말 밤새 진료하나요?','이 목록은 병원 이름으로 모은 것입니다. 병원마다 야간 진료 방식이 다르니 가기 전에 전화로 진료 가능 여부를 확인하세요.'],
      ['밤에 아이가 아프면 어떻게 하나요?','가까운 24시 동물병원에 먼저 전화해 증상을 말하고 진료가 되는지 확인한 뒤, 이동장이나 담요로 안전하게 옮기세요.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 동물병원',SITE+'/'],['24시 동물병원',`${SITE}/24h`]])}/>
  </div>;
}
