'use client';
import {useState} from 'react';
import {Reviews} from './review-controls';
export function Nearby({base}:{base:string}){
  const [state,setState]=useState('');
  function find(){
    if(!navigator.geolocation){setState('위치 기능을 지원하지 않습니다. 지역을 선택하세요.');return;}
    setState('위치를 확인하고 있습니다.');
    navigator.geolocation.getCurrentPosition(p=>{location.href=`${base}/search?lat=${p.coords.latitude}&lon=${p.coords.longitude}&radius_km=20`;},()=>setState('위치 권한을 확인하거나 지역을 직접 선택하세요.'),{timeout:10000,maximumAge:60000});
  }
  return <div><button type="button" className="nearby" onClick={find}>◎ 내 주변 20km</button>{state&&<p role="status" className="muted small">{state}</p>}</div>;
}
export function Admin(){
  const [token,setToken]=useState(''); const [result,setResult]=useState<{collection?:{status:string;total:number;completed:number;rejected:number;current_item:string}|null;sync?:{status:string;changed:number;source_hidden?:number;error?:string}|null;jobs:{id:string;status:string;total:number;completed:number;rejected:number;current_item:string;eta_seconds:number|null;error:string|null}[];issues:{external_id:string;rule:string;reason:string}[]}|null>(null); const [error,setError]=useState('');const [loading,setLoading]=useState(false);
  async function load(event?:React.FormEvent){event?.preventDefault();setError('');setLoading(true);
    try { const res=await fetch('/api/admin',{headers:{'x-admin-token':token},cache:'no-store'});const data=await res.json();if(!res.ok)throw new Error(data.detail || '조회에 실패했습니다.');setResult(data); }
    catch(e){setResult(null);setError(e instanceof Error?e.message:'조회에 실패했습니다.');}finally{setLoading(false);}
  }
  return <section className="admin"><div className="eyebrow">DATA OPERATIONS</div><h1>데이터 검수·수집 현황</h1><p className="muted">관리자 토큰은 이 화면의 메모리에서만 사용합니다.</p><form onSubmit={load} className="admin-login"><label>관리자 토큰<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} required/></label><button disabled={loading}>{loading?'조회 중':'현황 조회'}</button></form>{error&&<p className="notice" role="alert">{error}</p>}{result&&<>{result.collection&&<article className="job"><h2>전체 관광정보 수집</h2><p>{result.collection.status} · 사진·시설 보강 {result.collection.completed} / {result.collection.total} · 검수 대기 {result.collection.rejected}</p><progress value={result.collection.completed} max={result.collection.total||1}/><p>{result.collection.current_item}</p><button type="button" onClick={()=>load()} disabled={loading}>현황 새로고침</button></article>}<h2>원천 변경 동기화</h2><p>정기 동기화 기준: 매월 1일 오전 6시 · 월 1회(서버 배포 후 적용). 현재 200개 대상의 변경만 확인합니다. 내용이 바뀌면 검수를 초기화하고 원천 비공개 정보는 공개에서 제외합니다.</p><button type="button" disabled={loading} onClick={async()=>{setLoading(true);try{const r=await fetch('/api/admin',{method:'POST',headers:{'x-admin-token':token,'Content-Type':'application/json'},body:JSON.stringify({action:'sync'})});const d=await r.json();if(!r.ok)throw Error(d.detail||'시작 실패');await load();}catch(e){setError(e instanceof Error?e.message:'시작 실패');}finally{setLoading(false);}}}>변경 확인 시작</button>{result.sync&&<p>{result.sync.status} · 변경 {result.sync.changed}건 {result.sync.error||''}</p>}<h2>최근 수집</h2>{result.jobs.map(j=><article className="job" key={j.id}><div className="row"><strong>{j.status}</strong><span>{j.completed} / {j.total} · 오류 {j.rejected}</span></div><progress value={j.completed} max={j.total||1}/><p>{j.current_item}</p>{j.eta_seconds!==null&&<p>예상 남은 시간 {j.eta_seconds}초</p>}{j.error&&<p className="error">{j.error}</p>}</article>)}<h2>검증 오류</h2>{result.issues.length===0?<p>검증 오류가 없습니다.</p>:result.issues.map((v,i)=><p key={i}>{v.external_id} · {v.rule} · {v.reason}</p>)}</>}<Reviews token={token}/></section>;
}
