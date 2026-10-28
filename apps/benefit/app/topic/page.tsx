import type {Metadata} from 'next';
import Link from 'next/link';
import {breadcrumbLd,JsonLd} from '@guidejung/ui/seo';
import {fieldCount,FIELD_ORDER,FIELDS,items,n,SITE} from '../../lib/data';
export const metadata:Metadata={title:'분야별 지원금·혜택',description:'임신·출산, 보육·교육, 생활안정, 주거, 일자리·창업, 의료, 돌봄, 문화, 농어업 분야별 정부·지자체 혜택.',alternates:{canonical:'/topic'}};
export default function Topics(){const fc=fieldCount(items);
  return <div className="page"><nav className="crumbs"><Link href="/">홈</Link> › 분야별</nav><h1>분야별 지원금·혜택</h1>
    <div className="bf-cats">{FIELD_ORDER.map(f=><Link key={f} href={`/topic/${f}`}><span aria-hidden="true">{FIELDS[f].icon}</span><span><b>{FIELDS[f].label}</b><small>{n(fc[f])}가지 · {FIELDS[f].q}</small></span></Link>)}</div>
    <JsonLd data={breadcrumbLd([['내근처 혜택',SITE+'/'],['분야별',SITE+'/topic']])}/></div>;}
