'use client';
// 실시간 칸들: 극장 오늘 남은 상영(aka.page, 비공식)과 어제 박스오피스(KOBIS). 둘은 섞지 않고 따로 그린다(KOBIS 약관 제3조 ⑤).
import {useEffect,useState} from 'react';
import {kstHm,minDiff,n,seatTag,type Show} from '../../lib/fmt';

type ST={live:boolean;shows?:Show[];error?:string;src?:string};
export function useShows(id:string|null){
  const [d,setD]=useState<ST|null|undefined>(undefined);
  useEffect(()=>{if(!id)return;let live=true;setD(undefined);
    // 중계가 처음 부를 때 느려 실패하는 일이 있어 한 번만 다시 시도
    const get=(again:boolean):Promise<void>=>fetch('/api/showtimes?id='+encodeURIComponent(id)).then(r=>r.ok?r.json():Promise.reject()).then((x:ST)=>{if(!live)return;if(x.error&&again)return new Promise(r=>setTimeout(r,1500)).then(()=>get(false));setD(x);});
    get(true).catch(()=>{if(live)setD(null);});
    return ()=>{live=false;};},[id]);
  return d;
}
/** 지금 이후 상영만(이미 시작한 회차 제외). 새벽 회차('24:10')도 문자열 비교로 뒤에 옴. */
export const upcoming=(shows:Show[],now=kstHm())=>shows.filter(s=>s.start>=now);

export function Showtimes({id,name,chainLabel}:{id:string;name:string;chainLabel:string}){
  const d=useShows(id);const [movie,setMovie]=useState<string|'all'>('all');
  if(d===undefined)return <p className="mv-answer muted">오늘 상영 시간 확인 중…</p>;
  if(d===null||d.error)return <p className="mv-answer">지금 상영 시간을 불러오지 못했어요. 잠시 뒤 다시 열거나 {chainLabel} 앱·누리집에서 확인해 주세요.</p>;
  if(!d.live)return <p className="mv-answer">이 극장은 실시간 상영 시간을 받을 수 없어요. 전화나 극장 누리집에서 확인해 주세요.</p>;
  const now=kstHm(),left=upcoming(d.shows??[],now);
  if(!left.length)return <p className="mv-answer">오늘 남은 상영이 없어요{d.shows?.length?` (오늘 ${n(d.shows.length)}회 상영)`:''}.</p>;
  const movies=[...new Set(left.map(s=>s.movie))];
  const rows=left.filter(s=>movie==='all'||s.movie===movie);
  const soon=left.filter(s=>minDiff(now,s.start)<=30);
  return <div className="mv-shows">
    <p className="mv-answer">🎬 <b>{name}</b> 오늘 남은 상영 <b>{n(left.length)}회</b>{soon.length>0&&<> · 30분 안에 시작 <b>{soon.length}편</b></>}</p>
    {movies.length>1&&<div className="mv-chips" role="group" aria-label="영화">
      <button type="button" className={movie==='all'?'mv-chip on':'mv-chip'} onClick={()=>setMovie('all')}>전체 <small>{left.length}</small></button>
      {movies.map(m=><button type="button" key={m} className={movie===m?'mv-chip on':'mv-chip'} aria-pressed={movie===m} onClick={()=>setMovie(m)}>{m} <small>{left.filter(s=>s.movie===m).length}</small></button>)}</div>}
    <ul className="mv-times">{rows.slice(0,40).map((s,i)=>{const tag=seatTag(s);const mins=minDiff(now,s.start);
      return <li key={i} className={s.left===0?'sold':''}><b>{s.start}</b>{s.end&&<small>~{s.end}</small>}<span>{s.movie}</span>{s.screen&&<small className="muted">{s.screen}</small>}
        {tag&&<em className={s.left===0?'mv-seat sold':'mv-seat'}>{tag}</em>}{mins<=30&&mins>=0&&<em className="mv-soon">{mins}분 뒤</em>}</li>;})}</ul>
    <p className="muted small">{d.src} 앱 정보를 공개 중계로 받은 비공식 안내예요(5분마다 갱신). 남은 좌석은 바뀌니 예매는 극장 공식 앱·누리집에서 하세요.</p>
  </div>;
}

type BO={date:string;rows:{rank:string;name:string;open:string;audi:string;acc:string;inten:string;isNew:boolean}[]};
/** 어제 박스오피스 — 보일 때만 부름(하루 호출 한도 3,000회, 저장 안 함). */
export function BoxOffice({limit=10}:{limit?:number}){
  const [d,setD]=useState<BO|null|undefined>(undefined);const [el,setEl]=useState<HTMLElement|null>(null);
  useEffect(()=>{if(!el)return;let live=true;
    const go=()=>fetch('/api/boxoffice').then(r=>r.ok?r.json():Promise.reject()).then((x:BO)=>{if(live)setD(x);}).catch(()=>{if(live)setD(null);});
    const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();go();}},{rootMargin:'300px'});io.observe(el);
    return ()=>{live=false;io.disconnect();};},[el]);
  const day=d?`${+d.date.slice(4,6)}월 ${+d.date.slice(6,8)}일`:'어제';
  return <section className="mv-box" ref={setEl} aria-label="박스오피스">
    <h2>🏆 {day} 박스오피스</h2>
    {d===undefined&&<p className="muted">불러오는 중…</p>}
    {d===null&&<p className="muted">지금 박스오피스를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.</p>}
    {d&&<ol className="mv-rank-box">{d.rows.slice(0,limit).map(r=><li key={r.rank}><b>{r.rank}</b><span>{r.name}{r.isNew&&<em className="mv-new">NEW</em>}</span>
      <small>{n(+r.audi)}명{+r.inten!==0&&<> · {+r.inten>0?`▲${r.inten}`:`▼${-+r.inten}`}</>}<br/>누적 {n(+r.acc)}명{r.open&&` · ${r.open} 개봉`}</small></li>)}</ol>}
    <p className="muted small">출처: 영화진흥위원회 통합전산망 오픈 API(일별 박스오피스). 방문할 때마다 바로 확인해 보여 드리고 저장하지 않아요.</p>
  </section>;
}
