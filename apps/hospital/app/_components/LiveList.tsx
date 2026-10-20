'use client';
// Worker /api/search(지역·과목·검색어) 또는 /api/near(좌표) 결과를 StatusList로. 과목 칩을 누르면 같은 화면이 바로 바뀜.
import {useEffect,useState} from 'react';
import {DEPTS,MAIN_DEPTS,type Card} from '../../lib/fmt';
import {StatusList} from './StatusList';
type Query={region?:string;dept?:string;q?:string;lat?:number;lon?:number;km?:number;cond?:string};
export function LiveList({query,title,initial,deptChips=true,empty,filter}:{query:Query;title?:string;initial?:Card[];deptChips?:boolean;empty?:string;filter?:'all'|'open'|'night'|'sunday'|'holiday'}){
  const [dept,setDept]=useState(query.dept??'');const [res,setRes]=useState<{total:number;items:Card[]}|null>(null);const [busy,setBusy]=useState(false);
  const key=JSON.stringify({...query,dept});
  useEffect(()=>{const p=new URLSearchParams();for(const [k,v] of Object.entries({...query,dept}))if(v!==undefined&&v!=='')p.set(k,String(v));
    p.set('limit','100');let live=true;setBusy(true);
    fetch(`/api/${query.lat!=null?'near':'search'}?${p}`).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(live)setRes(d);}).catch(()=>{if(live)setRes({total:0,items:[]});}).finally(()=>{if(live)setBusy(false);});
    return ()=>{live=false;};},[key]); // eslint-disable-line react-hooks/exhaustive-deps
  const items=res?.items??initial??[];
  return <section className="hp-live" aria-busy={busy}>
    {title&&<h2>{title}{res&&<span className="muted"> {res.total.toLocaleString('ko-KR')}곳{res.total>items.length?` 중 ${items.length.toLocaleString('ko-KR')}곳`:''}</span>}</h2>}
    {deptChips&&<div className="hp-chips" role="group" aria-label="진료과목">{[['','전체 과목'],...MAIN_DEPTS.map(k=>[k,DEPTS[k]])].map(([k,l])=><button type="button" key={k} className={dept===k?'hp-chip dept on':'hp-chip dept'} aria-pressed={dept===k} onClick={()=>setDept(k)}>{l}</button>)}</div>}
    {busy&&!res&&!initial?.length?<p className="muted">불러오는 중…</p>:<StatusList items={items} initial={filter} empty={empty}/>}
  </section>;
}
