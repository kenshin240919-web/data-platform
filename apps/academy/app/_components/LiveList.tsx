'use client';
// 학원 목록(브라우저에서 Worker /api/search 호출): 과목·학년 칩을 누르면 같은 화면이 바로 바뀌고, '더 보기'로 이어서 봄.
import {useEffect,useState} from 'react';
import {GRADES,MAIN_SUBJECTS,SUBJECTS,type Card} from '../../lib/fmt';
import {AcademyCard} from './AcademyCard';

type Query={region?:string;lat?:number;lon?:number;km?:number;subject?:string;grade?:string;q?:string};
type Result={total:number;items:Card[]};
export function LiveList({initial,query,chips=true,title,empty='조건에 맞는 학원이 없어요.',onPick}:{initial?:Card[];query:Query;chips?:boolean;title?:string;empty?:string;onPick?:(c:Card)=>void}){
  const [subject,setSubject]=useState(query.subject??'');const [grade,setGrade]=useState(query.grade??'');
  const [items,setItems]=useState<Card[]>(initial??[]);const [total,setTotal]=useState<number|null>(null);
  const [page,setPage]=useState(1);const [busy,setBusy]=useState(false);const [failed,setFailed]=useState(false);
  const key=JSON.stringify({...query,subject,grade});
  useEffect(()=>{setPage(1);},[key]);
  useEffect(()=>{
    const p=new URLSearchParams();const q={...query,subject,grade};
    for(const [k,v] of Object.entries(q))if(v!==undefined&&v!=='')p.set(k,String(v));
    p.set('page',String(page));
    setBusy(true);setFailed(false);
    let live=true;
    fetch('/api/search?'+p).then(r=>r.ok?r.json():Promise.reject()).then((d:Result)=>{if(!live)return;setTotal(d.total);setItems(old=>page===1?d.items:[...old,...d.items]);})
      .catch(()=>{if(live)setFailed(true);}).finally(()=>{if(live)setBusy(false);});
    return ()=>{live=false;};
  },[key,page]); // eslint-disable-line react-hooks/exhaustive-deps
  const chip=(on:boolean,label:string,onClick:()=>void)=><button type="button" key={label} className={on?'ac-chip on':'ac-chip'} aria-pressed={on} onClick={onClick}>{label}</button>;
  return <section className="ac-list" aria-busy={busy}>
    {title&&<h2>{title}{total!=null&&<span className="muted"> {total.toLocaleString('ko-KR')}곳</span>}</h2>}
    {chips&&<div className="ac-chips" role="group" aria-label="과목">{chip(!subject,'전체 과목',()=>setSubject(''))}{MAIN_SUBJECTS.map(k=>chip(subject===k,SUBJECTS[k],()=>setSubject(subject===k?'':k)))}</div>}
    {chips&&<div className="ac-chips" role="group" aria-label="학년">{chip(!grade,'전체 학년',()=>setGrade(''))}{Object.entries(GRADES).map(([k,v])=>chip(grade===k,v,()=>setGrade(grade===k?'':k)))}</div>}
    {failed&&!items.length?<p className="muted">목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>:
      !busy&&total===0?<p className="muted">{empty}</p>:
      <div className="ac-cards">{items.map(c=><AcademyCard key={c.id} c={c} onPick={onPick}/>)}</div>}
    {busy&&<p className="muted">불러오는 중…</p>}
    {total!=null&&items.length<total&&!busy&&<button type="button" className="ac-more" onClick={()=>setPage(p=>p+1)}>더 보기 ({(total-items.length).toLocaleString('ko-KR')}곳 남음)</button>}
  </section>;
}
