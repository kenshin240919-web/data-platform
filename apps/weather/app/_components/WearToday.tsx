'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {WeatherResponse} from '../../lib/types';
import {clothes,todayKST} from '../../lib/format';
import {lastViewed} from './Recent';

/** 내 지역(최근 본 지역, 없으면 서울 중구)의 오늘 기온으로 옷차림을 바로 알려 준다. */
export function WearToday(){
  const [state,setState]=useState<{label:string;code:string;w:WeatherResponse}|null>(null);
  useEffect(()=>{const last=lastViewed()??{code:'11140',label:'서울 중구'};
    fetch(`/api/weather?code=${last.code}`).then(r=>r.json()).then(w=>setState({...last,w})).catch(()=>{});},[]);
  if(!state)return <div className="loading" role="status">오늘 기온을 확인하고 있습니다.</div>;
  const d=state.w.daily.find(x=>x.date===todayKST())??state.w.daily[0];const now=state.w.now?.temp??null;
  const avg=d&&d.min!==null&&d.max!==null?(d.min+d.max)/2:now;if(avg===null)return null;const c=clothes(avg);
  const gap=d&&d.min!==null&&d.max!==null?d.max-d.min:0;
  return <div className="wx-now air-hero">
    <p className="muted small" style={{color:'#d6e4ff'}}>{state.label} · 오늘 {d?.min}° / {d?.max}°{now!==null&&` · 지금 ${now}°`}</p>
    <p className="wx-summary">오늘은 <b>{c.short}</b> 추천해요</p><p>{c.detail}{gap>=10&&' · 일교차가 커서 겉옷을 꼭 챙기세요'}</p>
    <Link className="pill" href={`/region/${state.code}`}>{state.label} 날씨 자세히 →</Link>
  </div>;
}
