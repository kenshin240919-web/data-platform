'use client';
import Link from 'next/link';
import {type Pos,km,useMyPosition,here} from '@guidejung/ui/geo';
import {roadName} from '../../lib/format';
import type {RestLite} from './NearMe';

const won=(s:string)=>Number(s.replace(/[^\d]/g,''))||0;
/** Rest areas around the visitor (60km, at least 8 nearest); null when the position is unknown. */
export function nearRests(rests:RestLite[],pos:Pos|null){
  if(!pos)return null;const all=rests.map(r=>({r,d:km(here(pos).lat,here(pos).lon,r.lat,r.lng)})).sort((a,b)=>a.d-b.d);
  const within=all.filter(x=>x.d<=60);return (within.length>=8?within:all.slice(0,8));
}
const fmtKm=(d:number)=>d<10?`${d.toFixed(1)}km`:`${Math.round(d)}km`;

/** 기름값 싼 휴게소: 위치를 알면 내 근처(60km)에서, 모르면 전국에서 싼 순. */
export function GasList({rests,date}:{rests:RestLite[];date:string}){
  const {pos}=useMyPosition();const near=nearRests(rests,pos);
  const pool=(near?near:rests.map(r=>({r,d:-1}))).filter(x=>won(x.r.gas)>0).sort((a,b)=>won(a.r.gas)-won(b.r.gas)).slice(0,5);
  return <section className="section"><div className="section-heading"><div><div className="eyebrow">FUEL</div><h2>{near?(pos!.precise?'내 근처':'접속 위치 부근'):'오늘'} 기름값 싼 휴게소</h2></div><Link href="/gas">전국 기름값 순위</Link></div>
    <ol className="tf-top">{pool.map(({r,d},i)=><li key={r.code}><Link href={`/rest/${r.code}`}><span className="tf-rank">{i+1}</span><span className="tf-zname"><b>{r.name}</b><small>{roadName({name:r.route})} · {d>=0?fmtKm(d):r.area}</small></span><span className="tf-speed"><b>{r.gas.replace('원','')}</b>원<small>휘발유</small></span></Link></li>)}</ol>
    <p className="muted small">한국도로공사 휴게소 주유소 가격 · {date} 기준</p></section>;
}

/** 휴게소 대표 음식: 위치를 알면 가까운 휴게소부터. */
export function FoodCards({rests,fallback}:{rests:RestLite[];fallback:string[]}){
  const {pos}=useMyPosition();const near=nearRests(rests,pos);
  const list=near?near.filter(x=>x.r.food).slice(0,6):fallback.map(c=>({r:rests.find(r=>r.code===c)!,d:-1})).filter(x=>x.r);
  return <section className="section"><div className="section-heading"><div><div className="eyebrow">FOOD</div><h2>{near?(pos!.precise?'내 근처':'접속 위치 부근'):''} 휴게소 대표 음식</h2></div><Link href="/rest">휴게소 전체</Link></div>
    <div className="tf-cards">{list.map(({r,d})=><Link key={r.code} href={`/rest/${r.code}`} className="tf-card"><span className="tf-card-title">{r.name}{d>=0?` · ${fmtKm(d)}`:''}</span><strong>{r.food}</strong><small>{r.foodCost?`${r.foodCost} · `:''}{roadName({name:r.route})}</small></Link>)}</div></section>;
}
