'use client';
// 메인 3초 답(10/20): 내 위치(정확 또는 접속 위치)가 속한 시군구의 학원 수와 수학·영어·국어 공개 수강료 중앙값.
// 시군구는 내 위치 2km 안 학원들의 주소상 시군구 중 가장 많은 곳(경계 근처에서 중심점 거리보다 정확, 김포시청 → 검단구로 잡히던 것).
// 주변에 학원이 없으면 가장 가까운 행정 중심점.
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {km,useMyPosition,fixKmNow,here} from '@guidejung/ui/geo';
import {man,n} from '../../lib/fmt';
export type Area={id:string;name:string;lat:number;lon:number;count:number;math?:number;english?:number;korean?:number};
export function HomeLocal({areas}:{areas:Area[]}){
  const {pos}=useMyPosition();const [id,setId]=useState<string|null>(null);
  useEffect(()=>{if(!pos)return;let live=true;
    const near=areas.filter(x=>x.count>=20).reduce((x,y)=>km(here(pos).lat,here(pos).lon,y.lat,y.lon)<km(here(pos).lat,here(pos).lon,x.lat,x.lon)?y:x);setId(near.id);
    fetch(`/api/search?lat=${pos.lat}&lon=${pos.lon}&km=2`).then(r=>r.ok?r.json():null).then(fixKmNow).then(d=>{if(!live||!d?.items?.length)return;
      const c=new Map<string,number>();for(const it of d.items)if(it.region_id)c.set(it.region_id,(c.get(it.region_id)??0)+1);
      const best=[...c.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0];if(best&&areas.some(a=>a.id===best))setId(best);}).catch(()=>{});
    return ()=>{live=false;};},[pos?.lat,pos?.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  const a=areas.find(x=>x.id===id);if(!pos||!a)return null;
  const fees=([['수학','math'],['영어','english'],['국어','korean']] as const).filter(([,k])=>a[k]).map(([l,k])=>`${l} ${man(a[k]!)}`);
  return <Link href={`/region/${a.id}`} className="ac-local">
    <span className="ac-local-where">📍 {pos.precise?'우리 동네':'접속 위치 부근'} · {a.name}</span>
    <b>학원 {n(a.count)}곳{fees.length?<> · 공개 수강료 중앙값 {fees.join(' · ')}</>:null}</b>
    <span className="ac-local-go">우리 동네 학원·수강료 자세히 →</span>
  </Link>;
}
