import type {Metadata} from 'next';
import Link from 'next/link';
import {Faq,breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {ItemList} from '../_components/Cards';
import {Ad} from '../_components/Ad';
import {dueSoon,items,n,SITE,today} from '../../lib/data';
export const metadata:Metadata={title:'마감 임박 지원금·혜택 — 이번 주·이번 달',description:'신청 기한이 다가오는 정부·지자체 지원금과 혜택을 마감 날짜순으로 모았어요. 놓치기 전에 확인하세요.',alternates:{canonical:'/deadline'}};
export default function Deadline(){
  const week=dueSoon(items,7),month=dueSoon(items,31).filter(i=>!week.includes(i)),later=dueSoon(items,90).filter(i=>!week.includes(i)&&!month.includes(i));
  return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 마감 임박</nav><h1>📅 마감 임박 혜택</h1>
    <p className="bf-lead">신청 기한이 날짜로 적힌 혜택만 모았어요. 일주일 안 {n(week.length)}가지, 한 달 안 {n(week.length+month.length)}가지예요. 상시 신청인 혜택은 <Link href="/">우리 동네 혜택</Link>에서 보세요.</p>
    <section><h2>이번 주 마감</h2>{week.length?<ItemList list={week} today={today}/>:<p className="muted">일주일 안에 마감되는 혜택이 없어요.</p>}</section>
    <section><h2>한 달 안 마감</h2>{month.length?<ItemList list={month} today={today}/>:<p className="muted">없어요.</p>}</section>
    <Ad/>
    {later.length>0&&<section><h2>석 달 안 마감</h2><ItemList list={later} today={today}/></section>}
    <Faq items={[['마감 날짜는 정확한가요?','정부24에 적힌 신청 기한에서 날짜를 읽은 것이에요. ‘10월 중’처럼 날만 없는 것은 그 달 말일로 보여 드려요. 예산이 떨어지면 일찍 끝나기도 하니 담당 기관에 확인하세요.']]}/>
    <JsonLd data={breadcrumbLd([['내근처 혜택',SITE+'/'],['마감 임박',SITE+'/deadline']])}/></div>;
}
