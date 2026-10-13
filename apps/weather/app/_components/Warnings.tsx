'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';

export type WarningData={time:string|null;title:string;active:string[];preliminary:string[]};
const fmt=(t:string|null)=>t?`${+t.slice(4,6)}.${+t.slice(6,8)} ${t.slice(8,10)}:${t.slice(10,12)}`:'';
let cache:Promise<WarningData>|null=null;
function load(){return cache??=fetch('/api/warnings').then(r=>{if(!r.ok)throw new Error();return r.json();}).catch(e=>{cache=null;throw e;});}
function useWarnings(){const [w,setW]=useState<WarningData|null>(null);const [failed,setFailed]=useState(false);
  useEffect(()=>{load().then(setW,()=>setFailed(true));},[]);return {w,failed};}
/** "강풍 예비특보" 같은 제목 줄만 모아 짧게 보여 준다. */
const kinds=(lines:string[])=>lines.filter(l=>/(주의보|경보|예비특보)$/.test(l)||/^[^:]+(주의보|경보)\s*:/.test(l)).map(l=>l.split(':')[0].trim());

/** 모든 페이지 상단 띠: 발효 중 특보(빨강) 또는 예비특보(노랑). 없으면 아무것도 그리지 않는다. */
export function WarningBar(){
  const {w}=useWarnings();
  if(!w)return null;
  if(w.active.length)return <Link href="/warnings" className="warn-bar active"><span aria-hidden="true">🚨</span><b>기상특보 발효 중</b><span className="warn-text">{w.active.join(' · ')}</span><span className="warn-more">자세히 →</span></Link>;
  const pre=kinds(w.preliminary);
  if(pre.length)return <Link href="/warnings" className="warn-bar pre"><span aria-hidden="true">⚠️</span><b>예비특보</b><span className="warn-text">{[...new Set(pre.map(k=>k.replace(/\s*예비특보$/,'')))].join(' · ')} 특보가 내려질 수 있어요</span><span className="warn-more">지역 보기 →</span></Link>;
  return null;
}

/** /warnings 본문: 발효 현황과 예비특보 전체. */
export function WarningDetail(){
  const {w,failed}=useWarnings();
  if(failed)return <p className="notice" role="alert">특보 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>;
  if(!w)return <div className="loading" role="status">기상특보를 불러오고 있습니다.</div>;
  return <>
    <div className={`wx-now air-hero${w.active.length?' warn-hero':''}`}><p className="wx-summary">{w.active.length?`지금 ${w.active.length}건의 기상특보가 발효 중이에요`:'지금 발효 중인 기상특보는 없어요'}</p><p className="muted small">최근 통보: {w.title} · {fmt(w.time)} 기상청 발표</p></div>
    <section className="section"><h2>발효 중인 특보</h2>{w.active.length?<ul className="warn-list">{w.active.map(l=><li key={l}>{l}</li>)}</ul>:<p className="muted">없음</p>}</section>
    <section className="section"><h2>예비특보 (앞으로 내려질 수 있는 특보)</h2>{w.preliminary.length?<ul className="warn-list pre">{w.preliminary.map((l,i)=><li key={i} className={/예비특보$/.test(l)?'head':''}>{l}</li>)}</ul>:<p className="muted">없음</p>}</section>
  </>;
}
