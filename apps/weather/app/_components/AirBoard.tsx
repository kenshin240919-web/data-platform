'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {pmGrade} from '../../lib/format';

type Station={station:string;sido:string;time:string;pm10:number|null;pm25:number|null};
type Place={code:string;label:string};
/** 전국 미세먼지: 가장 깨끗한 곳·나쁜 곳 순위와 시도 평균. 항목마다 해당 지역 날씨로 이어진다. */
export function AirBoard({places}:{places:Record<string,Place>}){
  const [data,setData]=useState<{time:string|null;stations:Station[]}|null>(null);const [failed,setFailed]=useState(false);
  useEffect(()=>{fetch('/api/air').then(r=>{if(!r.ok)throw new Error();return r.json();}).then(setData,()=>setFailed(true));},[]);
  if(failed)return <p className="notice" role="alert">미세먼지 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>;
  if(!data)return <div className="loading" role="status">전국 측정소 미세먼지를 불러오고 있습니다.</div>;
  // 0은 장비 점검·결측으로 들어오는 경우가 많아 순위에서 뺀다.
  const rows=data.stations.filter(s=>s.pm25!==null&&s.pm25>0&&places[s.station]);
  const best=[...rows].sort((a,b)=>a.pm25!-b.pm25!).slice(0,10),worst=[...rows].sort((a,b)=>b.pm25!-a.pm25!).slice(0,10);
  const bySido=new Map<string,number[]>();for(const s of rows)bySido.set(s.sido,[...(bySido.get(s.sido)??[]),s.pm25!]);
  const sidos=[...bySido.entries()].map(([sido,v])=>({sido,avg:Math.round(v.reduce((a,b)=>a+b,0)/v.length)})).sort((a,b)=>a.avg-b.avg);
  const good=rows.filter(s=>(pmGrade('pm25',s.pm25)?.level??9)<=2).length;
  const item=(s:Station,i:number)=>{const p=places[s.station];const g=pmGrade('pm25',s.pm25);
    return <li key={s.station}><span className="rank">{i+1}</span><Link href={`/region/${p.code}`}><b>{p.label}</b><span className="muted small">{s.station} 측정소</span></Link><span className={`grade level-${g?.level??0}`}>{g?.text} {s.pm25}</span></li>;};
  return <>
    <div className="wx-now air-hero"><p className="wx-summary">지금 전국 측정소 {rows.length}곳 중 <b>{Math.round(good/Math.max(rows.length,1)*100)}%</b>가 초미세먼지 ‘보통’ 이하예요</p><p className="muted small">{data.time} 기준 · 에어코리아 실시간 측정값 · 초미세먼지(PM2.5) ㎍/㎥</p></div>
    <div className="air-cols">
      <section><h2>공기 가장 깨끗한 곳 TOP 10</h2><ol className="rank-list">{best.map(item)}</ol></section>
      <section><h2>공기 가장 나쁜 곳 TOP 10</h2><ol className="rank-list">{worst.map(item)}</ol></section>
    </div>
    <section className="section"><h2>시도별 평균 초미세먼지</h2><ul className="sido-bars">{sidos.map(s=>{const g=pmGrade('pm25',s.avg);
      return <li key={s.sido} className={`level-${g?.level??0}`}><span>{s.sido}</span><span className="wx-bar"><span style={{width:`${Math.min(100,s.avg/75*100)}%`}}/></span><b>{s.avg}</b><small>{g?.text}</small></li>;})}</ul></section>
  </>;
}
