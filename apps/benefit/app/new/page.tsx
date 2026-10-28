import type {Metadata} from 'next';
import Link from 'next/link';
import {breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {ItemList} from '../_components/Cards';
import {Ad} from '../_components/Ad';
import {changed,items,newest,SITE,today} from '../../lib/data';
export const metadata:Metadata={title:'새로 생긴 지원금·혜택',description:'정부24에 새로 등록되거나 최근 내용이 바뀐 정부·지자체 혜택을 날짜순으로 보여 드려요.',alternates:{canonical:'/new'}};
export default function New(){const fresh=newest(items,40),ids=new Set(fresh.map(i=>i.id)),upd=changed(items,60).filter(i=>!ids.has(i.id)).slice(0,30);
  return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 새 혜택</nav><h1>🆕 새로 생긴 혜택</h1>
    <section><h2>새로 등록된 혜택</h2><ItemList list={fresh} today={today}/></section><Ad/>
    <section><h2>최근 내용이 바뀐 혜택</h2><ItemList list={upd} today={today}/></section>
    <JsonLd data={breadcrumbLd([['내근처 혜택',SITE+'/'],['새 혜택',SITE+'/new']])}/></div>;}
