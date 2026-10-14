'use client';
import Link from 'next/link';
import {fmtTime,useIncidents} from './live';

const isAccident=(t:string)=>/사고|고장|낙하물|장애물|화재/.test(t);
/** 모든 페이지 상단 띠: 진행 중 사고(빨강) 또는 공사·통제(노랑). 없으면 그리지 않는다. */
export function IncidentBar(){
  const {data}=useIncidents();
  if(!data?.items.length)return null;
  const acc=data.items.filter(i=>isAccident(i.type)).length,other=data.items.length-acc;
  return <Link href="/incidents" className={`warn-bar ${acc?'active':'pre'}`}><span aria-hidden="true">{acc?'🚨':'🚧'}</span>
    <b>{acc?`고속도로 사고·고장 ${acc}건`:'고속도로 공사·통제'}</b><span className="warn-text">{acc?`공사·통제 등 ${other}건 함께 진행 중`:`최근 3일 ${other}건 진행 중`}</span><span className="warn-more">자세히 →</span></Link>;
}

/** /incidents 본문. */
export function IncidentList(){
  const {data,failed}=useIncidents();
  if(failed)return <p className="notice" role="alert">돌발 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>;
  if(!data)return <div className="loading" role="status">고속도로 사고·공사 정보를 불러오고 있습니다.</div>;
  const acc=data.items.filter(i=>isAccident(i.type));
  return <>
    <div className="tf-hero"><p className="tf-answer">{acc.length?<>지금 고속도로 사고·고장 <b>{acc.length}건</b></>:<>지금 처리 중인 사고는 <b>없어요</b></>}</p>
      <p className="tf-sub">공사·통제 등 {data.items.length-acc.length}건 진행 중 · {fmtTime(data.time)} 기준</p></div>
    {data.items.length?<ul className="tf-inc">{data.items.map((i,k)=><li key={k} className={isAccident(i.type)?'acc':''}>
      <div className="tf-inc-head"><span className="tag">{i.type||'돌발'}</span><b>{i.road}</b><span className="muted small">{i.dir}</span>{i.blocked>0&&<span className="tag jam">차로 {i.blocked}개 통제</span>}</div>
      <p>{i.text}</p><small className="muted">{i.date&&`${+i.date.slice(4,6)}.${+i.date.slice(6,8)}`} {i.time} 등록</small></li>)}</ul>
      :<p className="muted">진행 중인 사고·공사 정보가 없습니다.</p>}
  </>;
}
