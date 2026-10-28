import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {Connect,genericFor,linksForCode} from '@guidejung/ui/network';
import {ItemList} from '../../_components/Cards';
import {Ad} from '../../_components/Ad';
import {ageLabel,benefitPath,byViews,CODE_LABEL,DOC_TITLES,docUrl,dueLabel,FIELDS,HOUSE,INCOME,item,items,LIFE,localItems,onlyFor,region,scopeLabel,SITE,similar,today,won,type Item} from '../../../lib/data';

export const dynamicParams=false;
export function generateStaticParams(){return items.map(i=>({id:i.id}));}
type P={params:Promise<{id:string}>};
const short=(s?:string,k=90)=>s?(s.replace(/\s+/g,' ').replace(/^[○◦·\-\s]+/,'').slice(0,k)+(s.length>k?'…':'')):'';
const phone=(s?:string)=>s?.match(/(0\d{1,2}-\d{3,4}-\d{4}|1\d{3}-\d{4}|\b1\d{2}\b)/)?.[1];
const where=(i:Item)=>i.scope==='local'?i.region_name:i.scope==='sido'?`${i.sido} 전체`:'전국';
export async function generateMetadata({params}:P):Promise<Metadata>{
  const i=item((await params).id);if(!i)return {};
  const bits=[i.amount?`최대 ${won(i.amount)}`:'',i.due?dueLabel(i.due,i.due_exact,today):''].filter(Boolean).join(' · ');
  return {title:`${i.name}${i.scope!=='nation'?` (${where(i)})`:''} — 대상·금액·신청 방법`,
    description:`${where(i)} ${i.name}${bits?`(${bits})`:''}: ${short(i.target??i.sum,70)} ${short(i.content,50)}`.replace(/\s+/g,' ').slice(0,160),alternates:{canonical:benefitPath(i.id)}};
}
function Sec({title,text,id}:{title:string;text?:string;id?:string}){return text?<section className="bf-sec" id={id}><h2>{title}</h2><p className="bf-text">{text}</p></section>:null;}
export default async function Detail({params}:P){
  const i=item((await params).id);if(!i)notFound();
  const r=i.region?region(i.region):undefined;
  const age=ageLabel(i.age),inc=onlyFor(i.mask,INCOME),life=onlyFor(i.mask,LIFE,['JA0322']),house=onlyFor(i.mask,HOUSE,['JA0410']);
  const conds=[age,...(inc.length?[`소득 ${inc.map(c=>CODE_LABEL[c].replace('중위소득 ','')).join('·')}(중위소득)`]:[]),...life.map(c=>CODE_LABEL[c]),...house.map(c=>CODE_LABEL[c])].filter(Boolean) as string[];
  const sim=similar(i).sort((a,b)=>(b.amount??0)-(a.amount??0)||byViews(a,b)).slice(0,12);
  const same=(i.scope==='local'&&i.region?localItems(i.region):items.filter(x=>x.scope===i.scope&&x.sido===i.sido)).filter(x=>x.id!==i.id&&x.field===i.field).sort(byViews).slice(0,6);
  const tel=phone(i.tel);
  const ld={'@context':'https://schema.org','@type':'GovernmentService',name:i.name,url:SITE+benefitPath(i.id),description:short(i.purpose??i.sum??i.content,200),serviceType:FIELDS[i.field].label,
    ...(i.org?{provider:{'@type':'GovernmentOrganization',name:i.org}}:{}),areaServed:{'@type':i.scope==='nation'?'Country':'AdministrativeArea',name:i.scope==='nation'?'대한민국':where(i)},
    ...(i.url?{sameAs:i.url}:{})};
  return <div className="page">
    <nav className="crumbs"><Link href="/">홈</Link> › {r?<Link href={`/region/${r.code}`}>{r.name}</Link>:<Link href={`/topic/${i.field}`}>{FIELDS[i.field].label}</Link>} › {i.name}</nav>
    <div className="bf-head"><h1>{FIELDS[i.field].icon} {i.name}</h1><p><span className="bf-scope">{scopeLabel(i)}</span>{[i.org,i.dept,FIELDS[i.field].label,(i.kind??[]).join('·')].filter(Boolean).join(' · ')}</p></div>
    <p className="bf-answer">{i.amount?<>💰 지원 내용에 적힌 금액 <b>최대 {won(i.amount)}</b><br/></>:null}
      📅 {i.due?<b>{dueLabel(i.due,i.due_exact,today)}</b>:i.deadline?.includes('상시')?<b>상시 신청</b>:<>신청 기한은 아래 안내를 확인하세요</>}
      {conds.length>0&&<><br/>👤 {conds.join(' · ')}</>}</p>
    <div className="bf-actions">{i.apply&&<a href={i.apply} target="_blank" rel="noopener">✍️ 온라인 신청하러 가기</a>}{i.url&&<a className={i.apply?'sub':''} href={i.url} target="_blank" rel="noopener">정부24에서 자세히 보기</a>}
      {tel&&<a className="sub" href={`tel:${tel.replace(/-/g,'')}`}>📞 {tel}</a>}</div>
    {conds.length>0&&<div className="bf-cond" aria-label="받을 수 있는 사람">{conds.map(c=><span key={c}>{c}</span>)}</div>}
    <Sec title="누가 받나요?" text={i.target}/>
    <Sec title="선정 기준" text={i.crit}/>
    <Sec title="무엇을 받나요?" text={i.content}/>
    <Ad/>
    <Sec title="언제까지 신청하나요?" text={i.deadline}/>
    <Sec title="어떻게 신청하나요?" text={[i.how,i.howd].filter(Boolean).join('\n\n')}/>
    {(i.docs||i.doclinks?.length)&&<section className="bf-sec"><h2>준비 서류</h2>{i.docs&&<p className="bf-text">{i.docs}</p>}
      {i.docs_self&&<p className="bf-text"><b>본인이 확인해 내는 서류</b>{'\n'}{i.docs_self}</p>}{i.docs_off&&<p className="bf-text"><b>담당 공무원이 확인하는 서류</b>{'\n'}{i.docs_off}</p>}
      {i.doclinks?.length?<><p className="muted small">아래 서류는 가까운 무인민원발급기·주민센터에서 뗄 수 있어요.</p><div className="bf-docs">{i.doclinks.map(s=><a key={s} href={docUrl(s)}>🖨️ {DOC_TITLES[s]??s} 떼는 곳</a>)}</div></>:null}</section>}
    <section className="bf-sec"><h2>문의·접수</h2><dl className="bf-facts">{([['소관 기관',[i.org,i.dept].filter(Boolean).join(' ')],['접수 기관',i.recv],['문의',i.tel],['근거 법령',i.law],['자치법규',i.ordin],['행정규칙',i.rule]] as [string,string|undefined][]).filter(([,v])=>v).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>
    {sim.length>0&&<section><h2>비슷한 혜택, 다른 지역은?</h2><table className="bf-table"><thead><tr><th>혜택</th><th>지역</th><th>적힌 금액</th></tr></thead>
      <tbody>{sim.map(x=><tr key={x.id}><td><a href={benefitPath(x.id)}>{x.name}</a></td><td>{where(x)}</td><td>{x.amount?`최대 ${won(x.amount)}`:'—'}</td></tr>)}</tbody></table></section>}
    {same.length>0&&<section><h2>{where(i)} {FIELDS[i.field].label} 혜택 더 보기</h2><ItemList list={same} today={today} hideScope/></section>}
    <p className="bf-warn">이 내용은 정부24에 등록된 정보를 옮긴 것이에요. 금액·대상·기한은 해마다 바뀌고 예산이 떨어지면 일찍 끝날 수 있으니, 신청 전에 담당 기관에 꼭 확인하세요. 이 사이트는 정부·지자체와 관계없는 민간 정보 서비스예요.</p>
    <Faq title={`${i.name} 자주 묻는 질문`} items={([
      [`${i.name}은 누가 받을 수 있나요?`,short(i.target,200)],
      [`${i.name}은 얼마를 받나요?`,i.content?short(i.content,200):''],
      [`${i.name}은 언제까지 신청하나요?`,i.deadline?short(i.deadline,150):''],
      [`${i.name}은 어디서 신청하나요?`,[i.how,i.recv].filter(Boolean).join(' · ')+(i.apply?' 온라인으로도 신청할 수 있어요.':'')],
    ] as [string,string][]).filter(([,a])=>a&&a.trim())}/>
    <Connect title="함께 보면 좋은 정보" items={r?linksForCode(r.code,'benefit'):genericFor('benefit')}/>
    <JsonLd data={ld}/>
    <JsonLd data={breadcrumbLd([['내근처 혜택',SITE+'/'],...(r?[[r.name,`${SITE}/region/${r.code}`] as [string,string]]:[[FIELDS[i.field].label,`${SITE}/topic/${i.field}`] as [string,string]]),[i.name,SITE+benefitPath(i.id)]])}/>
    <p className="muted small">출처: 행정안전부 「대한민국 공공서비스(혜택) 정보」 · 서비스 ID {i.id}{i.mod?` · 정부24 수정일 ${i.mod}`:''}</p>
  </div>;
}
