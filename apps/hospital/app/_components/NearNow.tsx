'use client';
// 메인 3초 답: 내 위치 주변 지금 진료 중인 병원(과목 버튼으로 바꿈) + 가까운 응급실과 실시간 남은 병상.
import {useEffect,useState} from 'react';
import {LocateCard,useMyPosition,fixKmNow,padKm,within} from '@guidejung/ui/geo';
import {DEPTS,DEPT_ICON,hospitalPath,km,MAIN_DEPTS,statusOf,type Card} from '../../lib/fmt';
import {StatusList,useNow} from './StatusList';
type Er=Card&{beds:number|null;updated:string|null};
export function NearNow(){
  const {pos,status,request}=useMyPosition();const now=useNow();
  const [dept,setDept]=useState('');const [items,setItems]=useState<Card[]|null>(null);const [radius,setRadius]=useState(0);const [er,setEr]=useState<Er[]|null>(null);
  useEffect(()=>{if(!pos)return;let live=true;setItems(null);
    const load=(k:number):Promise<void>=>fetch(`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${padKm(k)}&limit=100${dept?`&dept=${dept}`:''}`).then(x=>x.json()).then(fixKmNow).then(within(k)).then((d:{items:Card[]}):Promise<void>|void=>{if(!live)return;
      const open=d.items.filter(p=>statusOf(p).state!=='closed').length;if(!open&&k<10)return load(k*2);setItems(d.items);setRadius(k);});
    load(pos.precise?2:5).catch(()=>{if(live)setItems([]);});return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,dept]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{if(!pos)return;let live=true;fetch(`/api/er?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}`).then(x=>x.json()).then(fixKmNow).then(d=>{if(live)setEr(d.items);}).catch(()=>{if(live)setEr([]);});return ()=>{live=false;};},[pos?.lat,pos?.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  const open=items&&now?items.filter(p=>statusOf(p,now).state!=='closed'):[];
  const first=open[0];const label=dept?DEPTS[dept]:'병원';
  return <section className="hp-near">
    <div className="hp-depts" role="group" aria-label="진료과목">{[['','전체'],...MAIN_DEPTS.map(k=>[k,DEPTS[k]])].map(([k,l])=><button type="button" key={k} className={dept===k?'on':''} aria-pressed={dept===k} onClick={()=>setDept(k)}><span aria-hidden="true">{k?DEPT_ICON[k]:'🏥'}</span>{l}</button>)}</div>
    {!pos?.precise&&<LocateCard title="내 위치 주변 지금 진료하는 병원 보기" desc="가까운 순으로 지금 진료 중인 곳과 마감 시간을 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!items&&<p className="hp-answer muted">내 주변 {label} 찾는 중…</p>}
    {items&&now&&<>
      <p className={`hp-answer ${first?'open':'closed'}`}><span className="hp-dot" aria-hidden="true"></span>{first?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 <b>지금 진료 중 {label} {open.length.toLocaleString('ko-KR')}곳</b> · 가장 가까운 곳 <a href={hospitalPath(first.id)}><b>{first.name}</b></a> {first.km!=null&&km(first.km)} ({statusOf(first,now).label})</>
        :<>📍 {radius}km 안에 지금 진료 중인 {label}이 없어요. 아래에서 진료 시간을 확인하거나 응급실을 이용하세요.</>}</p>
      <StatusList items={items} initial={first?'open':'all'} sortOpen={false} limit={10}/>
    </>}
    {er&&er.length>0&&<div className="hp-er"><h2>🚑 가까운 응급실</h2><div className="hp-er-list">{er.slice(0,4).map(e=><a key={e.id} href={hospitalPath(e.id)} className="hp-er-card"><b>{e.name}</b><span>{e.km!=null&&km(e.km)}{e.beds!=null&&<> · 응급실 남은 병상 <strong>{e.beds}</strong></>}</span>{e.updated&&<small className="muted">{e.updated} 기준</small>}</a>)}</div><p><a className="hp-more-link" href="/er">응급실 더 보기 →</a></p></div>}
  </section>;
}
