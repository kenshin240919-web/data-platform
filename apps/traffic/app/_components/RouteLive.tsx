'use client';
import Link from 'next/link';
import {Fragment,useEffect,useState} from 'react';
import {AdSlot} from '@guidejung/ui/ads';
import {dirLabel,roadName,type Route} from '../../lib/format';
import type {TrafficResponse} from '../../lib/types';
import {GRADE,fmtTime,useTraffic} from './live';

type Dir='E'|'S';
const count=(zones:Route['E'],t:TrafficResponse|null,g:number)=>t?zones.filter(([id])=>t.zones[id]?.[1]===g).length:0;

/** 노선 한 방향의 구간 목록: 3초 답(정체 몇 곳) → 방향 탭 → IC 순서대로 색깔 막대. 정적 HTML에는 구간 이름이 먼저 들어간다. */
export function RouteLive({route}:{route:Route}){
  const {data,failed}=useTraffic();
  const [dir,setDir]=useState<Dir>(route.E.length?'E':'S');
  // A shared link (#zoneId) opens the right direction and scrolls to it once the list exists.
  useEffect(()=>{const id=decodeURIComponent(location.hash.slice(1));if(!id)return;const d=id.includes('CZS')?'S':'E';setDir(d);
    setTimeout(()=>document.getElementById(id)?.scrollIntoView({block:'center'}),120);},[]);
  const zones=route[dir];const jam=count(zones,data,3),slow=count(zones,data,2);
  const speeds=data?zones.map(([id])=>data.zones[id]?.[0]??-1).filter(v=>v>0):[];
  const avg=speeds.length?Math.round(speeds.reduce((a,b)=>a+b,0)/speeds.length):null;
  const name=roadName(route);
  return <div className="tf">
    <section className={`tf-hero${jam?' jam':slow?' slow':''}`}>
      <p className="tf-answer">{!data?<>{name} {dirLabel(route,dir)} 구간 <b>{zones.length}곳</b></>:jam||slow?<>{dirLabel(route,dir)} 정체 <b>{jam}곳</b> · 서행 <b>{slow}곳</b></>:<>{dirLabel(route,dir)} 지금 <b>원활</b>해요</>}</p>
      <p className="tf-sub">{data?<>평균 {avg??'-'}km/h · {fmtTime(data.time)} 기준{data.stale?' (지연된 정보)':data.refreshing?' · 최신 정보 확인 중':''}</>:failed?'실시간 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.':<span role="status">실시간 속도를 불러오고 있어요…</span>}</p>
    </section>
    <div className="tf-dirs" role="tablist">{(['E','S'] as Dir[]).filter(d=>route[d].length).map(d=><button key={d} type="button" role="tab" aria-selected={dir===d} className={`chip${dir===d?' on':''}`} onClick={()=>setDir(d)}>
      {dirLabel(route,d)}{data&&count(route[d],data,3)>0&&<span className="tf-badge">정체 {count(route[d],data,3)}</span>}</button>)}</div>
    <ol className="tf-zones">{zones.map(([id,zname],i)=>{const v=data?.zones[id];const g=v?.[1]??0,sp=v?.[0]??-1;
      return <Fragment key={id}>{i===8&&<li className="tf-ad"><AdSlot/></li>}<li id={id} className={`tf-zone g${g}`}>
        <span className="tf-zname">{zname.replace('-',' → ')}</span>
        <span className="tf-bar" aria-hidden="true"><span style={{width:`${sp>0?Math.min(100,sp/110*100):0}%`}}/></span>
        <span className="tf-speed">{data?(sp>0?<><b>{sp}</b>km/h</>:'-'):'…'}<small>{data?GRADE[g].text:''}</small></span>
      </li></Fragment>;})}</ol>
    <p className="muted small">한국도로공사 구간(콘존) 소통 정보 · 구간 순서는 {dir==='E'?route.start:route.end}에서 {dir==='E'?route.end:route.start} 방향입니다. <Link href="/incidents">사고·공사 보기 →</Link></p>
  </div>;
}
