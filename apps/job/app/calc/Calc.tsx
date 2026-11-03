'use client';
// 계산기 4종(시급·주휴·월급 / 퇴직금 / 실업급여 / 4대보험). 입력은 브라우저 안에서만 계산(서버로 보내지 않음).
import {useState} from 'react';
import {insurance,MIN_WAGE,severance,unemployment,wage,won} from '../../lib/calc';
const num=(s:string)=>{const v=Number(s.replace(/[^0-9.]/g,''));return Number.isFinite(v)?v:0;};
function Field({label,value,set,unit,hint}:{label:string;value:string;set:(v:string)=>void;unit?:string;hint?:string}){
  return <label className="jb-field"><span>{label}</span><span><input inputMode="numeric" value={value} onChange={e=>set(e.target.value)}/>{unit&&<small>{unit}</small>}</span>{hint&&<small className="muted">{hint}</small>}</label>;
}
function Rows({rows}:{rows:[string,string,boolean?][]}){
  return <table className="jb-table jb-result"><tbody>{rows.map(([k,v,strong])=><tr key={k}><th>{k}</th><td>{strong?<b>{v}</b>:v}</td></tr>)}</tbody></table>;
}
export function WageCalc(){
  const [h,setH]=useState(String(MIN_WAGE));const [w,setW]=useState('40');
  const r=wage(num(h),Math.min(68,num(w)));
  return <div className="jb-calc">
    <Field label="시급" value={h} set={setH} unit="원"/><Field label="1주 일하는 시간" value={w} set={setW} unit="시간" hint="주휴수당은 1주 15시간 이상일 때"/>
    <Rows rows={[['주휴시간',`${r.holidayHours.toFixed(1)}시간`],['주휴수당(1주)',won(r.holidayPay),true],['주급(주휴 포함)',won(r.week)],['월급(주휴 포함, 월 '+r.monthHours+'시간)',won(r.month),true],['연봉 어림',won(r.year)]]}/>
    {r.belowMin&&num(h)>0&&<p className="jb-warn">⚠️ 2026년 최저임금 시간급 {MIN_WAGE.toLocaleString('ko-KR')}원보다 낮아요.</p>}
  </div>;
}
export function SeveranceCalc(){
  const [p,setP]=useState('9000000');const [d,setD]=useState('92');const [y,setY]=useState('3');const [m,setM]=useState('0');
  const service=Math.round(num(y)*365+num(m)*30.4);const r=severance(num(p),num(d),service);
  return <div className="jb-calc">
    <Field label="퇴직 전 3개월 임금 총액" value={p} set={setP} unit="원" hint="세금 떼기 전 금액. 상여금·연차수당은 정해진 비율만큼 더해요"/>
    <Field label="그 3개월의 날수" value={d} set={setD} unit="일" hint="보통 89~92일"/>
    <Field label="재직 기간" value={y} set={setY} unit="년"/><Field label="" value={m} set={setM} unit="개월"/>
    <Rows rows={[['1일 평균임금',won(r.daily)],['재직일수(어림)',`${service.toLocaleString('ko-KR')}일`],['퇴직금 어림',r.eligible?won(r.amount):'1년 미만이면 퇴직금이 없어요',true]]}/>
  </div>;
}
export function UnemploymentCalc(){
  const [a,setA]=useState('100000');const [hrs,setHrs]=useState('8');const [y,setY]=useState('3');const [o,setO]=useState(false);
  const r=unemployment(num(a),num(hrs),num(y),o);
  return <div className="jb-calc">
    <Field label="이직 전 1일 평균임금" value={a} set={setA} unit="원" hint="퇴직 전 3개월 임금 총액 ÷ 그 3개월 날수"/>
    <Field label="1일 소정근로시간" value={hrs} set={setHrs} unit="시간"/>
    <Field label="고용보험 가입 기간" value={y} set={setY} unit="년"/>
    <label className="jb-check"><input type="checkbox" checked={o} onChange={e=>setO(e.target.checked)}/> 이직일 기준 50세 이상이거나 장애인이에요</label>
    <Rows rows={[['평균임금의 60%',won(r.raw)],['1일 받는 금액',won(r.daily)+(r.capped?' (상한)':r.floored?' (하한)':''),true],['받는 날수',`${r.days}일`],['모두 받으면 어림',won(r.total),true]]}/>
  </div>;
}
export function InsuranceCalc(){
  const [m,setM]=useState(String(Math.round(209*MIN_WAGE)));
  const r=insurance(num(m));
  return <div className="jb-calc">
    <Field label="월급(세전, 비과세 수당 뺀 금액)" value={m} set={setM} unit="원"/>
    <Rows rows={[['국민연금 4.75%',won(r.pension)],['건강보험 3.595%',won(r.health)],['장기요양(건강보험료의 13.14%)',won(r.ltc)],['고용보험 0.9%',won(r.employ)],['4대보험 합계',won(r.total),true],['4대보험을 뺀 금액',won(r.after),true]]}/>
    <p className="muted small">소득세·지방소득세는 넣지 않았어요(근로소득 간이세액표·부양가족 수에 따라 달라져요).</p>
  </div>;
}
