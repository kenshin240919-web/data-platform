'use client';
// 장날(5일장): 날짜는 브라우저에서 한국 시간으로 다시 계산(정적 페이지는 하루 한 번만 빌드됨).
// 목록은 /jang.json(정적, 수백 곳)을 받아 휴대폰 안에서 거리를 잼 — 위치를 서버로 보내지 않음.
import {useEffect,useState} from 'react';
import {LocateCard,here,useMyPosition} from '@guidejung/ui/geo';
import {WEEK,dayLabel,distKm,jangOn,kstDay,km,n,nextJangs,type SlimFair} from '../../lib/fmt';

let cache:Promise<SlimFair[]>|null=null;
const load=()=>cache??=fetch('/jang.json').then(r=>r.json() as Promise<SlimFair[]>).catch(()=>{cache=null;return [];});

/** full: /jang 페이지(날짜 칩·목록), 아니면 첫 화면 띠 한 줄 */
export function JangToday({full=false}:{full?:boolean}){
  const {pos,status,request}=useMyPosition();
  const [list,setList]=useState<SlimFair[]|null>(null);const [off,setOff]=useState(0);const [more,setMore]=useState(12);
  useEffect(()=>{load().then(setList);},[]);
  if(!list)return full?<p className="mk-answer muted">오늘 장 서는 시장 찾는 중…</p>:null;
  if(!list.length)return null;
  const day=kstDay(Date.now()+off*864e5),p=pos?here(pos):null;
  const on=list.filter(f=>jangOn(f,day)).map(f=>({f,km:p&&f.lat!=null&&f.lon!=null?distKm(p.lat,p.lon,f.lat,f.lon):null}))
    .sort((a,b)=>(a.km??1e9)-(b.km??1e9)||a.f.r.localeCompare(b.f.r,'ko'));
  const first=on[0],when=off===0?'오늘':off===1?'내일':'';
  if(!full)return <a className="mk-jang-band" href="/jang"><span aria-hidden="true">📅</span><span><span>오늘 <b>{dayLabel(day)}</b> 장 서는 5일장 <b>{n(on.length)}곳</b></span>
    {first?.km!=null&&<small>가장 가까운 곳 {first.f.name} {km(first.km)}</small>}</span><em>보기 →</em></a>;
  return <section className="mk-jang-today">
    <div className="mk-chips" role="group" aria-label="날짜">{Array.from({length:7},(_,i)=>{const k=kstDay(Date.now()+i*864e5);
      return <button type="button" key={i} className={off===i?'mk-chip on':'mk-chip'} aria-pressed={off===i} onClick={()=>{setOff(i);setMore(12);}}>{i===0?'오늘':i===1?'내일':`${k.m}/${k.d}`}({WEEK[k.wd]})</button>;})}</div>
    <p className="mk-answer">📅 {when} <b>{dayLabel(day)}</b> 장 서는 시장 <b>{n(on.length)}곳</b>
      {first&&first.km!=null&&<> — {pos?.precise?'내 주변':'접속 위치에서'} 가장 가까운 곳 <a href={first.f.href}><b>{first.f.name}</b></a> {km(first.km)}</>}</p>
    {!pos?.precise&&<LocateCard title="내 주변 장날 보기" desc="가까운 5일장부터 보여 드려요(위치는 휴대폰 안에서만 써요)" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {on.length>0?<div className="mk-cards">{on.slice(0,more).map(({f,km:d})=><a key={f.id} className="mk-card" href={f.href} data-gj-pt={f.lat!=null?`${f.lat},${f.lon}`:undefined} data-gj-name={f.name}>
      <span className="mk-icon" aria-hidden="true">🧺</span>
      <span className="mk-card-body"><b>{f.name}</b><small>{d!=null&&<span className="mk-km">{km(d)}</span>}{f.r}</small></span>
      <span className="mk-card-n"><b>{when||`${day.m}/${day.d}`}</b><small>장날</small></span></a>)}</div>
      :<p className="muted">이날 장이 서는 시장이 없어요. 다른 날짜를 눌러 보세요.</p>}
    {on.length>more&&<button type="button" className="mk-more" onClick={()=>setMore(x=>x+12)}>더 보기 ({n(on.length-more)}곳 남음)</button>}
  </section>;
}

/** 시장 상세: 오늘이 장날인지·다음 장날·앞으로 장날 6번 */
export function JangNext({days,wd}:{days?:number[];wd?:number[]}){
  const [list,setList]=useState<ReturnType<typeof nextJangs>|null>(null);
  useEffect(()=>{setList(nextJangs({days,wd},6));},[days,wd]);
  if(!list?.length)return null;
  const t=list[0];
  return <>
    <p className="mk-answer">{t.after===0?<>🎉 <b>오늘 {dayLabel(t)} 장날</b>이에요!</>:<>📅 다음 장날 <b>{dayLabel(t)}</b> · {t.after===1?'내일':`${t.after}일 뒤`}</>}</p>
    <div className="mk-chips" aria-label="앞으로 장날">{list.map(k=><span key={`${k.m}-${k.d}`} className={k.after===0?'mk-chip on':'mk-chip'}>{k.after===0?'오늘':k.after===1?'내일':`${k.m}/${k.d}`}({WEEK[k.wd]})</span>)}</div>
  </>;
}
