import {academyPath,feeRange,GRADES,subjectLabel,SUBJECT_ICON,type Card} from '../../lib/fmt';
/** 학원 카드(서버·브라우저 공용). 링크는 일반 <a>: 상세는 Worker가 D1에서 만들어 Next 미리 받기 대상이 아님. */
export function AcademyCard({c}:{c:Card}){
  const fee=feeRange(c);
  return <a className="ac-card" href={academyPath(c.id)}>
    <span className="ac-card-icon" aria-hidden="true">{SUBJECT_ICON[c.subjects[0]]??'🏫'}</span>
    <span className="ac-card-body">
      <b>{c.name}</b>
      <small>{[c.type,...c.subjects.slice(0,3).map(subjectLabel),c.grades.map(g=>GRADES[g]).join('·')].filter(Boolean).join(' · ')}</small>
      <small className="muted">{c.km!=null?`📍 ${c.km<1?`${Math.round(c.km*1000)}m`:`${c.km.toFixed(1)}km`} · `:''}{c.address}</small>
    </span>
    <span className={fee?'ac-fee':'ac-fee none'}>{fee??'수강료 미공개'}</span>
  </a>;
}
