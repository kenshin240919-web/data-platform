'use client';
// 메인 3초 답: 저장한 '내 학교'의 오늘 급식·다음 급식·다가오는 일정 D-day·오늘 시간표(Worker /api/today). 없으면 학교 고르기.
import {useEffect,useState} from 'react';
import {ALLERGENS,dday,mdw,schoolPath,type Meal,type Today} from '../../lib/fmt';
import {setMine,useMine} from './mine';
import {SchoolPicker} from './SchoolPicker';

const lunchOf=(d:Today['meal'])=>d?.meals.find(m=>m.type==='중식')??d?.meals[0];
function Dishes({m}:{m:Meal}){return <ul className="sc-dishes">{m.dishes.map((d,i)=><li key={i}><span>{d.name}</span>{d.allergens.length>0&&<small>{d.allergens.map(a=>ALLERGENS[a]).join('·')}</small>}</li>)}</ul>;}
export function MySchool(){
  const mine=useMine();
  const [t,setT]=useState<Today|null>(null);const [failed,setFailed]=useState(false);
  useEffect(()=>{if(!mine){setT(null);return;}let live=true;setFailed(false);
    const p=new URLSearchParams({code:mine.code,...(mine.grade&&mine.cls?{grade:mine.grade,class:mine.cls}:{})});
    fetch('/api/today?'+p).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(live)setT(d);}).catch(()=>{if(live)setFailed(true);});
    return ()=>{live=false;};},[mine?.code,mine?.grade,mine?.cls]); // eslint-disable-line react-hooks/exhaustive-deps
  if(mine===undefined)return <div className="sc-mine sc-mine-wait" aria-busy="true"/>;
  if(!mine)return <section className="sc-pick-first"><h2>⭐ 내 학교를 골라 주세요</h2><p className="muted">한 번 고르면 다음부터 열자마자 오늘 급식이 보여요(이 브라우저에만 저장).</p><SchoolPicker/></section>;
  const lunch=lunchOf(t?.meal??null),next=t?.next?lunchOf(t.next):null;
  return <section className="sc-mine" aria-live="polite">
    <div className="sc-mine-head"><a href={schoolPath(mine.code)}><b>⭐ {mine.name}</b></a><button type="button" className="sc-link" onClick={()=>setMine(null)}>학교 바꾸기</button></div>
    {!t&&!failed&&<p className="sc-mine-answer muted">오늘 급식 불러오는 중…</p>}
    {failed&&<p className="sc-mine-answer">급식 정보를 불러오지 못했어요. <a href={schoolPath(mine.code)}>학교 페이지에서 보기 →</a></p>}
    {t&&<>
      <p className="sc-mine-answer">🍱 {lunch?<>오늘 {mdw(t.today)} {lunch.type}{lunch.cal&&<span className="muted"> · {lunch.cal}</span>}</>:<>오늘 {mdw(t.today)}은 올라온 급식이 없어요</>}</p>
      {lunch&&<Dishes m={lunch}/>}
      {next&&t.next&&<p className="sc-next">다음 급식 <b>{mdw(t.next.date)}</b> · {next.dishes.slice(0,4).map(d=>d.name).join(' · ')}{next.dishes.length>4?' …':''}</p>}
      {t.events.length>0&&<div className="sc-dday-row">{t.events.slice(0,3).map(e=><span key={e.date+e.name} className="sc-dday-chip"><b>{dday(t.today,e.date)}</b> {e.name}</span>)}</div>}
      {t.timetable&&<p className="sc-next">📚 오늘 {mine.grade}학년 {mine.cls}반 · {t.timetable.periods.filter(Boolean).map((p,i)=>`${i+1}.${p}`).join(' ')}</p>}
      <div className="sc-mine-go"><a href={schoolPath(mine.code)}>이번 주 급식·학사일정{mine.k!=='other'?'·시간표':''} 보기 →</a></div>
    </>}
  </section>;
}
