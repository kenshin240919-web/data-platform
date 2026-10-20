'use client';
import {academyPath,feeRange,GRADES,subjectLabel,SUBJECT_ICON,type Card} from '../../lib/fmt';
import {COMPARE_MAX,toggleCompare} from '../../lib/compare';
import {useCompare} from './useCompare';
/** 학원 카드. 링크는 일반 <a>: 상세는 Worker가 D1에서 만들어 Next 미리 받기 대상이 아님. 오른쪽 위 ⚖️ 버튼으로 비교함에 담기. */
export function AcademyCard({c}:{c:Card}){
  const fee=feeRange(c);const list=useCompare();const on=list.some(p=>p.id===c.id);
  return <div className="ac-card-wrap">
    <a className="ac-card" href={academyPath(c.id)}>
      <span className="ac-card-icon" aria-hidden="true">{SUBJECT_ICON[c.subjects[0]]??'🏫'}</span>
      <span className="ac-card-body">
        <b>{c.name}</b>
        <small>{[c.type,...c.subjects.slice(0,3).map(subjectLabel),c.grades.map(g=>GRADES[g]).join('·')].filter(Boolean).join(' · ')}</small>
        <small className="muted">{c.km!=null?`📍 ${c.km<1?`${Math.round(c.km*1000)}m`:`${c.km.toFixed(1)}km`} · `:''}{c.address}</small>
      </span>
      <span className={fee?'ac-fee':'ac-fee none'}>{fee??'수강료 미공개'}</span>
    </a>
    <button type="button" className={on?'ac-pick on':'ac-pick'} aria-pressed={on} title={on?'비교함에서 빼기':'비교함에 담기'}
      onClick={()=>{if(!toggleCompare({id:c.id,name:c.name}))alert(`비교는 최대 ${COMPARE_MAX}곳까지예요. 비교함에서 하나를 빼 주세요.`);}}>{on?'✓ 비교':'+ 비교'}</button>
  </div>;
}
