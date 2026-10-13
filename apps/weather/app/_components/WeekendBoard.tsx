'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import type {Day,WeatherResponse} from '../../lib/types';
import {dayLabel,skyEmoji,todayKST} from '../../lib/format';

type Spot={code:string;label:string;sido:string;trip:{id:string;count:number}|null};
type Row={spot:Spot;days:Day[];rain:number};
const TRIP='https://trip.guidejung.com';
/** 이번 주말 전국 날씨: 비 올 확률이 낮은 시도부터 보여 주고 각 지역 날씨·여행지로 연결한다. */
export function WeekendBoard({spots}:{spots:Spot[]}){
  const [rows,setRows]=useState<Row[]>([]);const [done,setDone]=useState(0);
  useEffect(()=>{
    let alive=true;const today=todayKST();const queue=[...spots];
    async function worker(){while(queue.length&&alive){const s=queue.shift()!;
      try{const w:WeatherResponse=await fetch(`/api/weather?code=${s.code}`).then(r=>r.json());
        const days=w.daily.filter(d=>d.date>=today&&dayLabel(d.date,today).weekend).slice(0,2);
        if(days.length&&alive)setRows(r=>[...r,{spot:s,days,rain:Math.max(...days.map(d=>Math.max(d.am.pop??0,d.pm.pop??0)))}]);
      }catch{}
      if(alive)setDone(n=>n+1);}}
    Promise.all([worker(),worker(),worker(),worker()]);
    return ()=>{alive=false;};
  },[spots]);
  const sorted=[...rows].sort((a,b)=>a.rain-b.rain);const today=todayKST();
  const sunny=sorted.filter(r=>r.rain<30);
  return <>
    <div className="wx-now air-hero"><p className="wx-summary">{done<spots.length?`전국 주말 날씨를 모으는 중이에요 (${done}/${spots.length})`:sunny.length?`이번 주말 ${sunny.slice(0,3).map(r=>r.spot.sido).join('·')} 등 ${sunny.length}곳이 맑을 전망이에요`:'이번 주말은 전국 곳곳에 비 소식이 있어요'}</p><p className="muted small">시도 대표 지역 기준 · 비 올 확률 낮은 순</p></div>
    <ul className="weekend-list">{sorted.map(({spot,days,rain})=><li key={spot.code}>
      <Link className="weekend-place" href={`/region/${spot.code}`}><b>{spot.sido}</b><span className="muted small">{spot.label}</span></Link>
      <div className="weekend-days">{days.map(d=>{const l=dayLabel(d.date,today);return <div key={d.date}><span className="small">{l.name}</span><span aria-hidden="true">{skyEmoji(d.pm.sky||d.am.sky)}</span><b>{d.min??'-'}°/{d.max??'-'}°</b><span className={`wx-pop${Math.max(d.am.pop??0,d.pm.pop??0)>=60?' high':''}`}>{Math.max(d.am.pop??0,d.pm.pop??0)}%</span></div>;})}</div>
      {spot.trip?<a className={`weekend-trip${rain<30?' good':''}`} href={`${TRIP}/region/${spot.trip.id}`}>{rain<30?'나들이 갈 곳 →':'가볼만한곳 →'}</a>:<span/>}
    </li>)}</ul>
  </>;
}
