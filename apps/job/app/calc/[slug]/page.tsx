import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {CALCS,ORDER,type Slug} from '../info';
import {CalcView} from '../view';
type P={params:Promise<{slug:string}>};
export const dynamicParams=false;
// 연말정산은 하위 페이지(연봉별·상황별)가 있어 /calc/yearend/page.tsx가 따로 그림.
export function generateStaticParams(){return ORDER.filter(s=>s!=='yearend').map(slug=>({slug}));}
export async function generateMetadata({params}:P):Promise<Metadata>{const s=(await params).slug as Slug;const c=CALCS[s];if(!c)return {};
  return {title:c.title,description:c.desc,alternates:{canonical:`/calc/${s}`}};}
export default async function CalcPage({params}:P){
  const s=(await params).slug as Slug;if(!CALCS[s]||s==='yearend')notFound();
  return <CalcView s={s}/>;
}
