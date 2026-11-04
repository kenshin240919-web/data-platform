'use client';
// 오늘 기준 '지금 접수 중 · 곧 접수 · 이번 주 시험 · 곧 발표' — 날짜는 브라우저에서 한국 날짜로 다시 셈(정적 HTML은 빌드한 날 기준).
import {useEffect,useState} from 'react';
import {board,CATS,days,kstToday,mdw,roundName,type Ev,type Round} from '../../lib/schedule';

const dday=(today:string,d:string)=>{const n=days(today,d);return n===0?'오늘':n>0?`D-${n}`:`${-n}일 지남`;};
function Row({e,today,mode}:{e:Ev;today:string;mode:'end'|'start'}){
  const d=mode==='end'?e.e:e.s;
  return <li><a href={`/schedule/${e.round.cat}#${e.round.id}`}>
    <span className="jb-sc-icon" aria-hidden="true">{CATS[e.round.cat].icon}</span>
    <span><b>{roundName(e.round)}</b><small>{e.stage} · {mdw(e.s)}{e.e!==e.s?` ~ ${mdw(e.e)}`:''}</small></span>
    <em>{mode==='end'?(d===today?'오늘 마감':`마감 ${dday(today,d)}`):e.s<=today&&today<=e.e?(e.e===today?'오늘까지':`진행 중 · ${mdw(e.e)}까지`):dday(today,d)}</em></a></li>;
}
export function Board({list,build}:{list:Round[];build:string}){
  const [today,setToday]=useState(build);
  useEffect(()=>{setToday(kstToday());},[]);
  const b=board(list,today);
  return <section className="jb-sc">
    <p className="jb-answer">{b.open.length?<>📝 지금 원서 접수 중 <b>{b.open.length}건</b> — 가장 빨리 끝나는 곳 <b>{roundName(b.open[0].round)} {b.open[0].stage}</b>, {b.open[0].e===today?'오늘 마감':`${mdw(b.open[0].e)} 마감`}</>
      :b.next?<>📅 지금 접수 중인 회차는 없어요. 다음 접수는 <b>{roundName(b.next.round)} {b.next.stage}</b> {mdw(b.next.s)}부터({dday(today,b.next.s)})</>
      
      :<>📅 올해 남은 원서 접수는 없어요. 다음 해 일정은 공단이 발표하면 매일 갱신돼요.</>}</p>
    {b.open.length>0&&<><h2>🟢 지금 접수 중</h2><ul className="jb-sclist">{b.open.map((e,i)=><Row key={i} e={e} today={today} mode="end"/>)}</ul></>}
    {b.soon.length>0&&<><h2>⏰ 2주 안에 접수 시작</h2><ul className="jb-sclist">{b.soon.map((e,i)=><Row key={i} e={e} today={today} mode="start"/>)}</ul></>}
    {b.exam.length>0&&<><h2>✏️ 이번 주·진행 중 시험</h2><ul className="jb-sclist">{b.exam.map((e,i)=><Row key={i} e={e} today={today} mode="start"/>)}</ul></>}
    {b.pass.length>0&&<><h2>🎉 일주일 안 합격 발표</h2><ul className="jb-sclist">{b.pass.map((e,i)=><Row key={i} e={e} today={today} mode="start"/>)}</ul></>}
    <p className="muted small">{today} 기준이에요. 날짜는 한국산업인력공단 자료 그대로이고, 종목마다 접수 시간·장소가 달라요.</p>
  </section>;
}
