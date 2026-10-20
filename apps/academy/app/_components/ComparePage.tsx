'use client';
import {useEffect,useState} from 'react';
import {academyPath,feeRange,GRADES,man,n,SUBJECTS,won,ymd} from '../../lib/fmt';
import {clearCompare,toggleCompare} from '../../lib/compare';
import {useCompare} from './useCompare';

type Fee={name:string;won:number;subjects:string[]};
type A={id:string;name:string;type:string|null;region_name:string;region_id:string;address:string|null;tel:string|null;subjects:string[];grades:string[];
  fee_min:number|null;fee_max:number|null;fees:Fee[];capacity:number|null;established:string|null;courses:{course:string|null;list:string|null}[]};
const OK=(f:Fee)=>f.won>=10000&&f.won<=3000000;
const median=(v:number[])=>{const s=[...v].sort((a,b)=>a-b);return s.length?s[Math.floor(s.length/2)]:null;};

export function ComparePage(){
  const list=useCompare();const ids=list.map(p=>p.id).join(',');
  const [rows,setRows]=useState<A[]|null>(null);const [failed,setFailed]=useState(false);
  useEffect(()=>{if(!ids){setRows([]);return;}let live=true;setFailed(false);
    fetch('/api/academies?ids='+ids).then(r=>r.ok?r.json():Promise.reject()).then(d=>{if(live)setRows(ids.split(',').map(id=>d.items.find((a:A)=>a.id===id)).filter(Boolean));}).catch(()=>{if(live)setFailed(true);});
    return ()=>{live=false;};},[ids]);
  if(!list.length)return <div className="ac-answer">비교함이 비어 있어요. 학원 카드나 학원 상세의 <b>+ 비교</b> 버튼을 눌러 최대 4곳을 담아 보세요. <a className="ac-more-link" href="/search">학원 찾기 →</a></div>;
  if(failed)return <p className="muted">비교 정보를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>;
  if(!rows)return <p className="muted">불러오는 중…</p>;
  // 둘 이상 학원에 있는 과목은 과목별 중앙값을 한 줄로 비교.
  const subjects=[...new Set(rows.flatMap(a=>a.subjects))].filter(k=>rows.filter(a=>a.fees.some(f=>OK(f)&&f.subjects.includes(k))).length>=1);
  const cell=(f:(a:A)=>React.ReactNode)=>rows.map(a=><td key={a.id}>{f(a)??<span className="muted">-</span>}</td>);
  return <>
    <p className="muted small">교육청에 공개된 금액 기준(기간 표기 없음). 실제 수강료는 학원에 꼭 확인하세요. 비교함은 이 브라우저에만 저장돼요.</p>
    <div className="ac-compare-scroll"><table className="ac-table ac-compare">
      <thead><tr><th></th>{rows.map(a=><th key={a.id}><a href={academyPath(a.id)}>{a.name}</a><button type="button" className="ac-x" aria-label={`${a.name} 빼기`} onClick={()=>toggleCompare({id:a.id,name:a.name})}>×</button></th>)}</tr></thead>
      <tbody>
        <tr><th>공개 수강료</th>{cell(a=>feeRange(a)?<b>{feeRange(a)}</b>:'미공개')}</tr>
        {subjects.map(k=><tr key={k}><th>{SUBJECTS[k]} (중앙값)</th>{cell(a=>{const m=median(a.fees.filter(f=>OK(f)&&f.subjects.includes(k)).map(f=>f.won));return m?man(m):null;})}</tr>)}
        <tr><th>과정별 수강료</th>{cell(a=>a.fees.length?<ul className="ac-mini">{a.fees.slice(0,8).map(f=><li key={f.name+f.won}>{f.name} <b>{won(f.won)}</b></li>)}{a.fees.length>8&&<li className="muted">외 {n(a.fees.length-8)}개</li>}</ul>:null)}</tr>
        <tr><th>과목</th>{cell(a=>a.subjects.map(k=>SUBJECTS[k]).join(', ')||null)}</tr>
        <tr><th>대상</th>{cell(a=>a.grades.map(g=>GRADES[g]).join(', ')||null)}</tr>
        <tr><th>구분</th>{cell(a=>a.type)}</tr>
        <tr><th>정원</th>{cell(a=>a.capacity?`${n(a.capacity)}명`:null)}</tr>
        <tr><th>개설일</th>{cell(a=>ymd(a.established))}</tr>
        <tr><th>지역·주소</th>{cell(a=><>{a.region_name}<br/><small className="muted">{a.address}</small></>)}</tr>
        <tr><th>전화</th>{cell(a=>a.tel?<a href={`tel:${a.tel.replace(/[^0-9]/g,'')}`}>{a.tel}</a>:null)}</tr>
      </tbody></table></div>
    <p><button type="button" className="ac-more" onClick={clearCompare}>비교함 비우기</button></p>
  </>;
}
