'use client';
import {useEffect,useState} from 'react';
import {AdSlot} from '@guidejung/ui/ads';
import type {Region,WeatherResponse} from '../../lib/types';
import {clothes,dayLabel,feelsLike,hh,hourSky,pmGrade,rainStart,skyEmoji,summary,sunTimes,todayKST,uvGrade,weekendLine} from '../../lib/format';
import {remember} from './Recent';

const TRIP='https://trip.guidejung.com';
const fmtIssued=(t:string|null)=>t?`${+t.slice(4,6)}.${+t.slice(6,8)} ${t.slice(8,10)}:${t.slice(10,12)||'00'} 발표`:'';

/** Live weather for one region, ordered so each answer leads to the next section (click → scroll → next page). */
export function WeatherPanel({region,label}:{region:Region;label:string}){
  const [w,setW]=useState<WeatherResponse|null>(null);const [failed,setFailed]=useState(false);
  useEffect(()=>{
    setW(null);setFailed(false);remember({code:region.code,label});
    const ctrl=new AbortController();
    fetch(`/api/weather?code=${region.code}`,{signal:ctrl.signal}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json();}).then(setW,e=>{if(e.name!=='AbortError')setFailed(true);});
    return ()=>ctrl.abort();
  },[region.code,label]);

  if(failed)return <p className="notice" role="alert">날씨 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>;
  if(!w)return <div className="loading" role="status">{label} 날씨를 불러오고 있습니다.</div>;

  const today=todayKST();const first=w.hourly[0];const sky=first?hourSky(first):'';
  const temp=w.now?.temp??first?.temp??null;const day=w.daily.find(d=>d.date===today)??w.daily[0];
  const feel=feelsLike(temp,w.now?.wind??first?.wind??null);const rain=rainStart(w);
  const avg=day&&day.min!==null&&day.max!==null?(day.min+day.max)/2:temp;const wear=avg!==null?clothes(avg):null;
  const pm10=pmGrade('pm10',w.air?.pm10??null),pm25=pmGrade('pm25',w.air?.pm25??null);
  const worst=[pm10,pm25].filter(Boolean).sort((a,b)=>b!.level-a!.level)[0];
  const uvMax=w.uv?.values.filter(v=>v.offset<=12).reduce((m,v)=>Math.max(m,v.value),0);
  const sun=sunTimes(region.lat,region.lon);const weekend=weekendLine(w.daily);
  const night=first?(hh(first.time)<6||hh(first.time)>=19):false;

  return <div className="wx">
    <section className="wx-now" aria-label={`${label} 현재 날씨`}>
      <div className="wx-now-main">
        <span className="wx-icon" aria-hidden="true">{skyEmoji(sky,night)}</span>
        <div><div className="wx-temp">{temp!==null?`${temp}°`:'-'}</div><div className="wx-sky">{sky}{feel!==null&&<> · 체감 {feel}°</>}</div></div>
      </div>
      <p className="wx-summary">{summary(w)}</p>
      <div className="wx-meta">
        {day&&<span>최저 <b>{day.min??'-'}°</b> / 최고 <b>{day.max??'-'}°</b></span>}
        {w.now?.humidity!=null&&<span>습도 {w.now.humidity}%</span>}
        {w.now?.wind!=null&&<span>바람 {w.now.wind}m/s</span>}
        <span className="muted">{fmtIssued(w.issued.now??w.issued.short)}</span>
      </div>
      {w.stale&&<p className="wx-stale">기상청 응답이 늦어 마지막으로 받은 예보를 보여 드립니다.</p>}
    </section>

    <section className="wx-cards" aria-label="오늘의 생활 정보">
      {wear&&<a className="wx-card" href="#weekly"><span className="wx-card-icon">👕</span><span className="wx-card-title">오늘 뭐 입지?</span><strong>{wear.short}</strong><small>{wear.detail}</small></a>}
      <a className={`wx-card${rain.need?' alert':''}`} href="#hourly"><span className="wx-card-icon">☂️</span><span className="wx-card-title">우산 필요?</span><strong>{rain.text}</strong><small>{rain.sub}</small></a>
      <a className={`wx-card${worst&&worst.level>=3?' alert':''}`} href="#air"><span className="wx-card-icon">😷</span><span className="wx-card-title">미세먼지</span><strong>{worst?.text??'측정 대기'}</strong><small>{w.air?`${w.air.station} 측정소`:'가까운 측정소 확인 중'}</small></a>
      {uvMax!==undefined&&uvMax>0?<a className="wx-card" href="#sun"><span className="wx-card-icon">🧴</span><span className="wx-card-title">자외선</span><strong>{uvGrade(uvMax)}</strong><small>오늘 최고 {uvMax}</small></a>
        :<a className="wx-card" href="#sun"><span className="wx-card-icon">🌅</span><span className="wx-card-title">해 뜨고 지는 시각</span><strong>{sun.rise} / {sun.set}</strong><small>일출 / 일몰</small></a>}
    </section>

    <AdSlot/>

    <section className="section wx-block" id="hourly">
      <div className="section-heading"><h2>시간별 날씨</h2><span className="muted small">옆으로 넘겨 보세요 →</span></div>
      <ol className="wx-hours">{w.hourly.map(h=>{const label=hh(h.time)===0?`${+h.time.slice(6,8)}일`:`${hh(h.time)}시`;const s=hourSky(h);
        return <li key={h.time} className={hh(h.time)===0?'day-start':''}><span className="muted small">{label}</span><span className="wx-h-icon" aria-label={s}>{skyEmoji(s,hh(h.time)<6||hh(h.time)>=19)}</span><b>{h.temp??'-'}°</b><span className={`wx-pop${(h.pop??0)>=60?' high':''}`}>{h.pop??0}%</span></li>;})}</ol>
    </section>

    <section className="section wx-block" id="weekly">
      <div className="section-heading"><h2>10일 예보</h2>{weekend&&<span className="wx-weekend">{weekend}</span>}</div>
      <ul className="wx-days">{w.daily.map(d=>{const l=dayLabel(d.date,today);
        return <li key={d.date} className={l.weekend?'weekend':''}><div className="wx-d-name"><b>{l.name}</b><span className="muted small">{l.sub}</span></div>
          <div className="wx-d-half"><span aria-hidden="true">{skyEmoji(d.am.sky)}</span><span className="small">오전 {d.am.sky||'-'}</span><span className={`wx-pop${(d.am.pop??0)>=60?' high':''}`}>{d.am.pop??'-'}%</span></div>
          <div className="wx-d-half"><span aria-hidden="true">{skyEmoji(d.pm.sky)}</span><span className="small">오후 {d.pm.sky||'-'}</span><span className={`wx-pop${(d.pm.pop??0)>=60?' high':''}`}>{d.pm.pop??'-'}%</span></div>
          <div className="wx-d-temp"><span className="min">{d.min??'-'}°</span><span className="max">{d.max??'-'}°</span></div></li>;})}</ul>
      <p className="muted small">{w.issued.short&&`단기예보 ${fmtIssued(w.issued.short)}`}{w.issued.mid&&` · 중기예보 ${fmtIssued(w.issued.mid)} (${region.midTaName} 기온 기준)`}</p>
    </section>

    <section className="section wx-block" id="air">
      <div className="section-heading"><h2>미세먼지</h2><span className="muted small">{w.air?`${w.air.station} 측정소 · ${w.air.time}`:''}</span></div>
      {w.air?<div className="wx-air">
        {[{name:'미세먼지 PM10',v:w.air.pm10,g:pm10,max:150},{name:'초미세먼지 PM2.5',v:w.air.pm25,g:pm25,max:75}].map(({name,v,g,max})=>
          <div key={name} className={`wx-air-item level-${g?.level??0}`}><span>{name}</span><strong>{g?.text??'-'}</strong><span className="small">{v??'-'}㎍/㎥</span>
            <span className="wx-bar"><span style={{width:`${Math.min(100,(v??0)/max*100)}%`}}/></span></div>)}
      </div>:<p className="muted">가까운 측정소 자료를 받지 못했습니다.</p>}
    </section>

    <section className="section wx-block" id="sun">
      <div className="section-heading"><h2>해 뜨고 지는 시각</h2></div>
      <div className="wx-sun"><div><span aria-hidden="true">🌅</span> 일출 <b>{sun.rise}</b></div><div><span aria-hidden="true">🌇</span> 일몰 <b>{sun.set}</b></div>{uvMax!==undefined&&uvMax>0&&<div><span aria-hidden="true">🧴</span> 자외선 최고 <b>{uvMax} ({uvGrade(uvMax)})</b></div>}</div>
      <p className="muted small">일출·일몰은 지역 중심 좌표로 계산한 값입니다.</p>
    </section>

    <AdSlot/>

    {region.trip&&<a className="wx-trip" href={`${TRIP}/region/${region.trip.id}`}>
      <span className="wx-trip-icon" aria-hidden="true">🚗</span>
      <span><strong>{label} 가볼만한곳 {region.trip.count}곳</strong><small>{weekend??'날씨 좋은 날 가볼 만한 여행지를 찾아보세요'}</small></span><span className="pill">여행정보 보기 →</span>
    </a>}
  </div>;
}
