import Link from 'next/link';
import {KIND_ORDER,KINDS,LINKS,n,type Kind} from '../../lib/fmt';
/** 상황별 입구 5개(첫 화면) — 클릭·체류: 내 상황을 고르면 맞는 기관 목록과 안내로. */
export const SITUATIONS:{id:string;icon:string;title:string;desc:string;href:string}[]=[
  {id:'quit',icon:'😮‍💨',title:'일을 그만뒀어요',desc:'관할 고용센터에서 실업급여·구직 신청',href:'/guide#quit'},
  {id:'today',icon:'🔨',title:'오늘 일당 일자리',desc:'가까운 인력사무소(직업소개소)',href:'/guide#today'},
  {id:'women',icon:'👩',title:'다시 일하고 싶어요',desc:'경력단절 여성 — 새일센터 상담·직업교육',href:'/guide#women'},
  {id:'senior',icon:'👴',title:'어르신 일자리',desc:'시니어클럽·노인복지관 노인일자리',href:'/guide#senior'},
  {id:'youth',icon:'🎓',title:'청년·대학생',desc:'대학일자리플러스센터·청년 지원',href:'/guide#youth'},
];
export function Situations(){
  return <section><h2>어떤 상황이세요?</h2><div className="jb-situ">{SITUATIONS.map(s=><Link key={s.id} href={s.href}><span aria-hidden="true">{s.icon}</span><span><b>{s.title}</b><small>{s.desc}</small></span></Link>)}</div></section>;
}
export function KindCards({counts}:{counts:Record<Kind,number>}){
  return <section><h2>어디로 가세요?</h2><div className="jb-kinds">{KIND_ORDER.filter(k=>counts[k]).map(k=><Link key={k} href={`/${k}`} className="jb-kindcard">
    <span aria-hidden="true">{KINDS[k].icon}</span><span><b>{KINDS[k].title}</b><small>{KINDS[k].desc}</small></span><em>{n(counts[k])}곳</em></Link>)}</div></section>;
}
export function Official(){
  return <p className="jb-note">채용 공고는 이 사이트에 없어요. 공고는 <a href={LINKS.work24} rel="noopener" target="_blank">고용24</a>(고용노동부)에서, 노인일자리는 <a href={LINKS.senior} rel="noopener" target="_blank">노인일자리 여기</a>, 경력단절 여성 일자리는 <a href={LINKS.saeil} rel="noopener" target="_blank">e새일</a>에서 찾으세요.</p>;
}
