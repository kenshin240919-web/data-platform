'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {LocateCard,km,useMyPosition} from '@guidejung/ui/geo';
import {dirLabel,roadName,type Route} from '../../lib/format';
import {CctvPlayer,cctvName} from './CctvPlayer';
import {GRADE,useCctv,useTraffic} from './live';

export type RestLite={code:string;name:string;routeNo:string;lat:number;lng:number;dir:string;gas:string;food:string};
const fmtKm=(d:number)=>d<1?`${Math.round(d*1000)}m`:`${d.toFixed(d<10?1:0)}km`;

/** 메인 첫 화면: 내 위치(허용 전에는 접속 위치 부근) 기준 가까운 고속도로 상황·휴게소·CCTV. */
export function NearMe({routes,rests}:{routes:Route[];rests:RestLite[]}){
  const {pos,status,request}=useMyPosition();const {data}=useTraffic();const cctv=useCctv();
  const [play,setPlay]=useState<number|null>(null);
  const near=useMemo(()=>pos?rests.map(r=>({r,d:km(pos.lat,pos.lon,r.lat,r.lng)})).sort((a,b)=>a.d-b.d):[],[pos,rests]);
  const nearRoutes=useMemo(()=>{const seen:string[]=[];for(const {r} of near){if(!seen.includes(r.routeNo))seen.push(r.routeNo);if(seen.length===3)break;}
    return seen.map(no=>routes.find(x=>x.no===no)).filter((r):r is Route=>!!r);},[near,routes]);
  const cams=useMemo(()=>pos&&cctv.data?cctv.data.items.map(c=>({c,d:km(pos.lat,pos.lon,c.lat,c.lng)})).sort((a,b)=>a.d-b.d).slice(0,6):[],[pos,cctv.data]);
  const where=pos?.precise?'내 근처':pos?.label?`${pos.label} 부근`:'접속 위치 부근';
  return <section className="section tf-near">
    {!pos?.precise&&<LocateCard title="내 근처 고속도로 상황 보기" desc="가까운 고속도로의 막히는 구간·휴게소·CCTV를 먼저 보여 드려요" status={status} onClick={request} approxLabel={pos?.label}/>}
    {pos&&<>
      <div className="section-heading"><div><div className="eyebrow">NEAR ME</div><h2>{where} 고속도로</h2></div></div>
      <div className="tf-cards">{nearRoutes.map(r=>{const ids=(d:'E'|'S')=>r[d].map(z=>z[0]);
        const jam=(d:'E'|'S')=>data?ids(d).filter(id=>data.zones[id]?.[1]===3).length:0,slow=data?[...ids('E'),...ids('S')].filter(id=>data.zones[id]?.[1]===2).length:0;
        const worst=data?[...r.E,...r.S].map(([id,n])=>({id,n,z:data.zones[id]})).filter(x=>x.z&&x.z[1]>=2&&x.z[0]>0).sort((a,b)=>b.z[1]-a.z[1]||a.z[0]-b.z[0])[0]:undefined;
        return <Link key={r.no} href={`/road/${r.no}${worst?`#${worst.id}`:''}`} className={`tf-card tf-near-road${jam('E')+jam('S')?' jam':slow?' slow':''}`}>
          <span className="tf-card-title">{r.start} ↔ {r.end}</span><strong>{roadName(r)}</strong>
          <small>{data?(jam('E')+jam('S')?`${dirLabel(r,'E')} 정체 ${jam('E')} · ${dirLabel(r,'S')} 정체 ${jam('S')}`:slow?`서행 ${slow}곳 · 정체 없음`:'지금 원활해요'):'실시간 확인 중…'}</small>
          {worst&&<small className="tf-worst">가장 느린 곳: {worst.n.replace('-',' → ')} {worst.z[0]}km/h ({GRADE[worst.z[1]].text})</small>}</Link>;})}</div>
      {cams.length>0&&<><div className="section-heading"><h2>📹 {where} CCTV</h2></div>
        <div className="chips big">{cams.map(({c,d},i)=><button key={c.url} type="button" className="tf-cam" onClick={()=>setPlay(i)}>📹 {cctvName(c)} <span className="muted small">{fmtKm(d)}</span></button>)}</div></>}
      <div className="section-heading"><h2>{where} 휴게소</h2><Link href="/rest">휴게소 전체</Link></div>
      <div className="tf-cards">{near.slice(0,3).map(({r,d})=><Link key={r.code} href={`/rest/${r.code}`} className="tf-card">
        <span className="tf-card-title">{fmtKm(d)}{r.dir?` · ${r.dir} 방향`:''}</span><strong>{r.name}</strong><small>{[r.food,r.gas&&`휘발유 ${r.gas}`].filter(Boolean).join(' · ')||'편의시설 보기'}</small></Link>)}</div>
    </>}
    {play!==null&&<CctvPlayer list={cams.map(x=>x.c)} index={play} onIndex={setPlay} onClose={()=>setPlay(null)}/>}
  </section>;
}
