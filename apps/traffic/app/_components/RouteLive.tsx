'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {AdSlot} from '@guidejung/ui/ads';
import {LocateCard,km,useMyPosition} from '@guidejung/ui/geo';
import {dirLabel,roadName,type Route} from '../../lib/format';
import type {Cctv,TrafficResponse} from '../../lib/types';
import {CctvPlayer,cctvName,cctvRoad} from './CctvPlayer';
import {GRADE,fmtTime,useCctv,useTraffic} from './live';

export type Seg={i:number;from:string;to:string;e?:string;s?:string;mid?:[number,number]};
/** 구간 목록(IC 순서): E(종점 방향) 구간을 뼈대로, 이름이 거꾸로인 S 구간("B-A")을 같은 줄에 붙인다. */
export function segments(r:Route):Seg[]{
  const sByName=new Map(r.S.map(([id,n])=>[n,id]));const p=r.pts;
  const mid=(i:number):[number,number]|undefined=>p&&p[i]&&p[i+1]?[(p[i][0]+p[i+1][0])/2,(p[i][1]+p[i+1][1])/2]:undefined;
  if(r.E.length)return r.E.map(([id,n],i)=>{const [a,b]=n.split('-');return {i,from:a,to:b??'',e:id,s:sByName.get(`${b}-${a}`),mid:mid(i)};});
  return [...r.S].reverse().map(([id,n],i)=>{const [b,a]=n.split('-');return {i,from:a??'',to:b,s:id,mid:mid(i)};});
}
/** Route CCTVs ("[경부선] 판교"). */
export function routeCctvs(items:Cctv[],r:Route){const base=r.name.replace(/\(.+\)$/,'');return items.filter(c=>{const n=cctvRoad(c);return n===r.name||n===base;});}
const z=(t:TrafficResponse|null,id?:string)=>id&&t?t.zones[id]:undefined;
const fmtKm=(d:number)=>d<10?`${d.toFixed(1)}km`:`${Math.round(d)}km`;

/** 속도 칸: 색깔 배경 + 숫자 + 원활/서행/정체. */
export function Speed({t,id,label}:{t:TrafficResponse|null;id?:string;label:string}){
  if(!id)return <span className="tf-pill g0"><small>{label}</small>-</span>;
  const v=z(t,id);const g=v?.[1]??0,sp=v?.[0]??-1;
  return <span className={`tf-pill g${g}`} id={id}><small>{label}</small>{t?(sp>0?<span className="tf-v"><b>{sp}</b><i> km/h</i> <em>{GRADE[g].text}</em></span>:'정보 없음'):'…'}</span>;
}

/**
 * 노선 페이지: 내 위치가 먼저 — 3초 답(내 주변 구간 상태) → 📍 내 주변 CCTV·구간 카드 → 내 구간부터 시작하는 전체 구간 표(구간마다 가까운 CCTV 1개).
 * 정적 HTML에는 구간 이름이 들어가 검색에 노출된다.
 */
export function RouteLive({route}:{route:Route}){
  const {data,failed}=useTraffic();const cctv=useCctv();const {pos,status,request}=useMyPosition();
  const segs=useMemo(()=>segments(route),[route]);
  const cams=useMemo(()=>cctv.data?routeCctvs(cctv.data.items,route):[],[cctv.data,route]);
  // Nearest CCTV of this road to each 구간 (within 3km of its middle).
  const camOf=useMemo(()=>segs.map(s=>{if(!s.mid||!cams.length)return -1;let best=-1,bd=3;cams.forEach((c,k)=>{const d=km(s.mid![0],s.mid![1],c.lat,c.lng);if(d<bd){bd=d;best=k;}});return best;}),[segs,cams]);
  const [play,setPlay]=useState<number|null>(null);const [all,setAll]=useState(false);
  useEffect(()=>{const id=decodeURIComponent(location.hash.slice(1));if(id)setTimeout(()=>document.getElementById(id)?.closest('tr,article')?.scrollIntoView({block:'center'}),200);},[]);
  // A loop (start = end, e.g. 수도권제1순환선) has no useful end name: say 시점·종점 instead.
  const loop=!route.dirs&&route.start===route.end;
  const L=loop?'시점 방향':dirLabel(route,'S'),R=loop?'종점 방향':dirLabel(route,'E');
  const jamE=segs.filter(s=>z(data,s.e)?.[1]===3).length,jamS=segs.filter(s=>z(data,s.s)?.[1]===3).length;
  const bad=segs.filter(s=>(z(data,s.e)?.[1]??0)>=2||(z(data,s.s)?.[1]??0)>=2)
    .sort((a,b)=>Math.min(...[z(data,a.e),z(data,a.s)].map(v=>v&&v[0]>0?v[0]:999))-Math.min(...[z(data,b.e),z(data,b.s)].map(v=>v&&v[0]>0?v[0]:999)));
  const here=useMemo(()=>{if(!pos)return null;let k=-1,bd=Infinity;segs.forEach((s,i)=>{if(!s.mid)return;const d=km(pos.lat,pos.lon,s.mid[0],s.mid[1]);if(d<bd){bd=d;k=i;}});return k<0?null:{k,d:bd};},[pos,segs]);
  const card=(s:Seg)=><article key={s.i} className="tf-seg-card">
    <h3>{s.from} → {s.to}</h3>
    <div className="tf-seg-pills"><Speed t={data} id={s.s} label={`◀ ${L}`}/><Speed t={data} id={s.e} label={`${R} ▶`}/></div>
    {camOf[s.i]>=0&&<button type="button" className="tf-cam-btn" onClick={()=>setPlay(camOf[s.i])}>📹 {cctvName(cams[camOf[s.i]])} CCTV 보기</button>}
  </article>;
  const near=here&&here.d<=30?segs.slice(Math.max(0,here.k-3),here.k+4):null;
  const nearBad=near?near.filter(s=>(z(data,s.e)?.[1]??0)>=2||(z(data,s.s)?.[1]??0)>=2).length:0;
  // Nearest CCTVs of this road to me, closest first.
  const myCams=pos&&near?cams.map((c,k)=>({c,k,d:km(pos.lat,pos.lon,c.lat,c.lng)})).sort((a,b)=>a.d-b.d).slice(0,6):[];
  // The table starts around my 구간 (a few before it), otherwise at the route's start.
  const from=here&&here.d<=30?Math.max(0,here.k-4):0;const rows=all?segs:segs.slice(from,from+20);
  const where=pos?.precise?'내 위치':'접속 위치';
  return <div className="tf">
    <section className={`tf-hero${near?(near.some(s=>z(data,s.e)?.[1]===3||z(data,s.s)?.[1]===3)?' jam':nearBad?' slow':''):jamE+jamS?' jam':bad.length?' slow':''}`}>
      <p className="tf-answer">{near?(!data?<>📍 {where} 주변 <b>{segs[here!.k].from}</b> 부근</>:nearBad?<>📍 {where} 주변 서행·정체 <b>{nearBad}곳</b></>:<>📍 {where} 주변 <b>원활</b>해요</>)
        :!data?<>{roadName(route)} 구간 <b>{segs.length}개</b></>:jamE+jamS?<>지금 정체 <b>{jamE+jamS}곳</b></>:bad.length?<>서행 <b>{bad.length}곳</b>, 정체는 없어요</>:<>지금 <b>원활</b>해요</>}</p>
      <p className="tf-sub">{data?<>{near?`${segs[here!.k].from} 부근 ${fmtKm(here!.d)} · 전체 노선 정체 ${jamE+jamS}곳`:`${R} 정체 ${jamE} · ${L} 정체 ${jamS}`} · {fmtTime(data.time)} 기준</>:failed?'실시간 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.':<span role="status">실시간 속도를 불러오고 있어요…</span>}</p>
    </section>

    <section className="tf-block">
      {!pos?.precise&&<LocateCard title="내 위치 주변 구간 보기" desc={`${roadName(route)}에서 내 위치와 가까운 구간·CCTV를 먼저 보여 드려요`} status={status} onClick={request}/>}
      {near&&<><h2>📍 {where} 주변 구간 <span className="muted small">{segs[here!.k].from} 부근 · {fmtKm(here!.d)}</span></h2>
        {myCams.length>0&&<div className="tf-mycams">{myCams.map(({c,k,d})=><button key={c.url} type="button" className="tf-cam-btn" onClick={()=>setPlay(k)}>📹 {cctvName(c)} <small>{fmtKm(d)}</small></button>)}</div>}
        <div className="tf-seg-grid">{near.map(card)}</div></>}
      {here&&here.d>30&&pos?.precise&&<p className="notice">이 고속도로는 내 위치에서 약 {fmtKm(here.d)} 떨어져 있어요. <Link href="/">내 근처 고속도로 보기 →</Link></p>}
    </section>

    <AdSlot/>

    <section className="tf-block"><h2>{from&&!all?`${where} 주변부터 보는 구간`:'전체 구간'} <span className="muted small">{segs.length}개 · {route.start} → {route.end} 순서</span></h2>
      <table className="tf-table"><thead><tr><th>구간</th><th>◀ {L}</th><th>{R} ▶</th><th>CCTV</th></tr></thead>
        <tbody>{rows.map(s=><tr key={s.i} className={here?.k===s.i?'here':''}><td><b>{s.from}</b> → {s.to}{here?.k===s.i&&<span className="tf-here">📍 내 위치</span>}</td>
          <td><Speed t={data} id={s.s} label=""/></td><td><Speed t={data} id={s.e} label=""/></td>
          <td>{camOf[s.i]>=0?<button type="button" className="tf-cam-icon" aria-label={`${cctvName(cams[camOf[s.i]])} CCTV 보기`} onClick={()=>setPlay(camOf[s.i])}>📹</button>:<span className="muted">-</span>}</td></tr>)}</tbody></table>
      {segs.length>20&&<button type="button" className="tf-more" onClick={()=>setAll(!all)}>{all?(from?`${where} 주변만 보기`:'접기'):`전체 ${segs.length}개 구간 모두 보기`}</button>}
      <p className="muted small">한국도로공사 구간 소통 정보 · 📹는 그 구간에서 가장 가까운 CCTV입니다. <Link href="/incidents">사고·공사 보기 →</Link></p>
    </section>

    {cams.length>0&&<details className="tf-block tf-camlist"><summary>{roadName(route)} CCTV 전체 목록 ({cams.length}곳)</summary>
      <ul>{cams.map((c,i)=><li key={c.url}><button type="button" onClick={()=>setPlay(i)}>📹 {cctvName(c)}</button></li>)}</ul></details>}
    {play!==null&&<CctvPlayer list={cams} index={play} onIndex={setPlay} onClose={()=>setPlay(null)}/>}
  </div>;
}
