'use client';
// 화면 아래에 떠 있는 비교함 띠: 담은 학원이 있을 때만.
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useCompare} from './useCompare';
export function CompareBar(){
  const list=useCompare();const path=usePathname();
  if(!list.length||path==='/compare')return null;
  return <div className="ac-comparebar" role="region" aria-label="학원 비교함"><span>⚖️ 비교함 <b>{list.length}</b>/4 · {list.map(p=>p.name).join(', ')}</span><Link href="/compare">비교하기 →</Link></div>;
}
