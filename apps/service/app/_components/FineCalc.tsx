'use client';
// 🗓️ 검사 기한·과태료 계산기: 검사 기간 마지막 날을 넣으면 남은 날 또는 늦은 날과 예상 과태료. 날짜는 이 브라우저에만 저장(gj.inspect).
import {useEffect,useState} from 'react';
import {fineFor,n} from '../../lib/fmt';
const KEY='gj.inspect';
export function FineCalc(){
  const [d,setD]=useState('');
  useEffect(()=>{try{setD(localStorage.getItem(KEY)??'');}catch{}},[]);
  const save=(v:string)=>{setD(v);try{v?localStorage.setItem(KEY,v):localStorage.removeItem(KEY);}catch{}};
  const today=new Date(new Date().toISOString().slice(0,10)),end=d?new Date(d):null;
  const diff=end&&!isNaN(+end)?Math.round((+end-+today)/864e5):null;
  return <section className="sv-calc" aria-label="검사 기한·과태료 계산기">
    <h2>🗓️ 자동차 검사 기한·과태료 계산기</h2>
    <label>검사 기간 마지막 날 <input type="date" value={d} onChange={e=>save(e.target.value)}/></label>
    <p className="muted small">자동차 검사 안내문이나 '자동차365'에서 내 차의 검사 기간을 확인해 넣으세요. 이 브라우저에만 저장돼 다음에 오면 D-day로 보여 드려요.</p>
    {diff!=null&&(diff>=0?<p className="sv-answer"><b>D-{n(diff)}</b> · 검사 기간이 {diff===0?'오늘 끝나요':`${n(diff)}일 남았어요`}. 가까운 검사소에 미리 예약하세요.</p>
      :<p className="sv-answer closed"><b>{n(-diff)}일 지났어요</b> · 예상 과태료 약 <b>{n(fineFor(-diff))}원</b>{fineFor(-diff)>=600000?' (최대)':''}</p>)}
    <p className="muted small">과태료는 '검사 기간이 끝난 뒤 30일 이내 4만 원, 이후 3일마다 2만 원 추가, 최대 60만 원'이라는 안내를 기준으로 한 예상 금액이에요. 정확한 금액은 관할 시·군·구청 고지서로 확인하세요.</p>
  </section>;
}
