'use client';
import Link from 'next/link';
import {Fragment,useEffect,useMemo,useState} from 'react';
import {AdSlot} from '@guidejung/ui/ads';
import {dirLabel,roadName,type Route} from '../../lib/format';
import type {Cctv,TrafficResponse} from '../../lib/types';
import {CctvPlayer,cctvName,cctvRoad} from './CctvPlayer';
import {GRADE,fmtTime,useCctv,useTraffic} from './live';

type Seg={from:string;to:string;e?:string;s?:string};
/** IC 순서 노선도: E(종점 방향) 구간을 뼈대로, 이름이 거꾸로인 S 구간("B-A")을 같은 줄에 붙인다. */
function segments(r:Route):Seg[]{
  const sByName=new Map(r.S.map(([id,n])=>[n,id]));
  if(r.E.length)return r.E.map(([id,n])=>{const [a,b]=n.split('-');return {from:a,to:b??'',e:id,s:sByName.get(`${b}-${a}`)};});
  return [...r.S].reverse().map(([id,n])=>{const [b,a]=n.split('-');return {from:a??'',to:b,s:id};});
}
const v=(t:TrafficResponse|null,id?:string)=>id&&t?t.zones[id]:undefined;
const count=(t:TrafficResponse|null,ids:(string|undefined)[],g:number)=>t?ids.filter(id=>id&&t.zones[id]?.[1]===g).length:0;
/** Route CCTVs ("[경부선] 판교"), ordered along the road's main axis. */
export function routeCctvs(items:Cctv[],r:Route){
  const base=r.name.replace(/\(.+\)$/,'');const list=items.filter(c=>{const n=cctvRoad(c);return n===r.name||n===base;});
  const lat=list.map(c=>c.lat),lng=list.map(c=>c.lng);const ns=Math.max(...lat)-Math.min(...lat)>=Math.max(...lng)-Math.min(...lng);
  return list.sort((a,b)=>ns?b.lat-a.lat:a.lng-b.lng);
}

/** 노선도: 3초 답(양방향 정체 수) → IC 순서 양방향 색깔 막대 → 이 노선 CCTV. 정적 HTML에는 IC 이름이 먼저 들어간다. */
export function RouteLive({route}:{route:Route}){
  const {data,failed}=useTraffic();const cctv=useCctv();
  const segs=useMemo(()=>segments(route),[route]);
  const cams=useMemo(()=>cctv.data?routeCctvs(cctv.data.items,route):[],[cctv.data,route]);
  const [play,setPlay]=useState<number|null>(null);
  useEffect(()=>{const id=decodeURIComponent(location.hash.slice(1));if(id)setTimeout(()=>document.getElementById(id)?.scrollIntoView({block:'center'}),150);},[]);
  const eIds=segs.map(s=>s.e),sIds=segs.map(s=>s.s);
  const eJam=count(data,eIds,3),sJam=count(data,sIds,3),slow=count(data,[...eIds,...sIds],2);
  const toEnd=dirLabel(route,'E'),toStart=dirLabel(route,'S');
  const cell=(id?:string,side?:'l'|'r')=>{const z=v(data,id);const g=z?.[1]??0,sp=z?.[0]??-1;
    return <span className={`tf-sp ${side} g${g}`} id={id}>{id?(data?(sp>0?<><b>{sp}</b><small>{GRADE[g].text}</small></>:<small>-</small>):'…'):''}</span>;};
  return <div className="tf">
    <section className={`tf-hero${eJam+sJam?' jam':slow?' slow':''}`}>
      <p className="tf-answer">{!data?<>{roadName(route)} <b>{segs.length}개</b> 구간</>:eJam+sJam?<>정체 <b>{eJam+sJam}곳</b> · 서행 <b>{slow}곳</b></>:slow?<>지금 서행 <b>{slow}곳</b>, 정체는 없어요</>:<>지금 <b>원활</b>해요</>}</p>
      <p className="tf-sub">{data?<>{toEnd} 정체 {eJam} · {toStart} 정체 {sJam} · {fmtTime(data.time)} 기준{data.refreshing?' · 최신 정보 확인 중':''}</>:failed?'실시간 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.':<span role="status">실시간 속도를 불러오고 있어요…</span>}</p>
    </section>
    {cams.length>0&&<button type="button" className="tf-cctv-open" onClick={()=>setPlay(0)}>📹 {roadName(route)} CCTV {cams.length}곳 바로 보기</button>}
    <div className="tf-diagram-head"><span>◀ {toStart}</span><span>{toEnd} ▶</span></div>
    <ol className="tf-diagram">{segs.map((s,i)=><Fragment key={s.e??s.s}>
      {i===10&&<li className="tf-ad"><AdSlot/></li>}
      {i===0&&<li className="tf-node"><span className="tf-dot" aria-hidden="true"/><b>{s.from}</b></li>}
      <li className="tf-seg">{cell(s.s,'l')}<span className={`tf-track g${v(data,s.s)?.[1]??0}`} aria-hidden="true"/><span className={`tf-track g${v(data,s.e)?.[1]??0}`} aria-hidden="true"/>{cell(s.e,'r')}</li>
      <li className="tf-node"><span className="tf-dot" aria-hidden="true"/><b>{s.to}</b></li>
    </Fragment>)}</ol>
    <p className="muted small">한국도로공사 구간 소통 정보 · 왼쪽은 {toStart}, 오른쪽은 {toEnd} 속도(km/h)입니다. <Link href="/incidents">사고·공사 보기 →</Link></p>
    {cams.length>0&&<section className="section"><div className="section-heading"><h2>{roadName(route)} CCTV</h2><span className="muted small">{cams.length}곳 · 누르면 실시간 영상</span></div>
      <div className="chips big">{cams.map((c,i)=><button key={c.url} type="button" className="tf-cam" onClick={()=>setPlay(i)}>📹 {cctvName(c)}</button>)}</div></section>}
    {play!==null&&<CctvPlayer list={cams} index={play} onIndex={setPlay} onClose={()=>setPlay(null)}/>}
  </div>;
}
