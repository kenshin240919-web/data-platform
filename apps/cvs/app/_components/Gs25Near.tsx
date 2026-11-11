'use client';
// 내 주변 GS25 매장 서비스(붕어빵·군고구마 등) — 방문 때만 /api/gs25(공개 중계, 비공식)로 받아 보여 주고 저장하지 않음.
// 서버엔 약 2km 칸 중심만 보내고, 거리는 휴대폰에서 정확한 위치로 다시 잼(fixKmNow).
import {useEffect,useState,type ReactNode} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow} from '@guidejung/ui/geo';
import {km,n,storePath,telHref} from '../../lib/fmt';
type G={name:string;addr:string;tel:string|null;lat:number;lon:number;km:number;props:string[];sid:string|null};
export type Pick={key:string;label:string;props:string[]};
const RADIUS=1.5;
export function Gs25Near({picks,title,verb='파는',note}:{picks:Pick[];title:string;verb?:string;note?:ReactNode}){
  const {pos,status,request}=useMyPosition();
  const [res,setRes]=useState<{items:G[];partial:boolean}|null|undefined>(undefined);const [k,setK]=useState(picks[0].key);const [more,setMore]=useState(10);
  useEffect(()=>{if(!pos)return;let live=true;setRes(undefined);
    fetch(`/api/gs25?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}`).then(r=>r.ok?r.json():Promise.reject(r.status)).then(fixKmNow)
      .then((d:{items:G[];partial:boolean})=>{if(live)setRes({partial:d.partial,items:[...d.items].sort((a,b)=>a.km-b.km)});}).catch(()=>{if(live)setRes(null);});
    return ()=>{live=false;};},[pos?.lat,pos?.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  const pick=picks.find(p=>p.key===k)??picks[0];
  const near=res?res.items.filter(s=>s.km<=RADIUS):[];
  const rows=near.filter(s=>pick.props.some(p=>s.props.includes(p)));
  const first=rows[0];
  return <section className="cv-near">
    <PosNote/>{!pos?.precise&&<LocateCard title={`내 위치 주변 ${title} 보기`} desc="GS25 앱 매장 정보 기준, 가까운 순으로" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {picks.length>1&&<div className="cv-chips" role="group" aria-label="고르기">{picks.map(p=><button type="button" key={p.key} className={p.key===k?'cv-chip on':'cv-chip'} aria-pressed={p.key===k} onClick={()=>{setK(p.key);setMore(10);}}>{p.label}{res&&<small> {n(near.filter(s=>p.props.some(x=>s.props.includes(x))).length)}</small>}</button>)}</div>}
    {pos&&res===undefined&&<p className="cv-answer muted">GS25 매장 정보 확인 중…</p>}
    {res===null&&<p className="cv-answer">지금 GS25 매장 정보를 불러오지 못했어요. 잠시 뒤 다시 열거나 GS25 앱에서 확인해 주세요.</p>}
    {res&&<>
      <p className="cv-answer">{rows.length?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {RADIUS}km 안 {pick.label} {verb} GS25 <b>{n(rows.length)}곳</b>
        {first&&<> — 가장 가까운 {first.sid?<a href={storePath(first.sid)}><b>{first.name}</b></a>:<b>{first.name}</b>} {km(first.km)}</>}</>
        :<>📍 {RADIUS}km 안 GS25 {n(near.length)}곳 중 {pick.label} {verb} 곳은 아직 없어요.</>}</p>
      {res.partial&&<p className="muted small">일부 구역 정보를 받지 못해 빠진 매장이 있을 수 있어요.</p>}
      {rows.length>0&&<div className="cv-cards">{rows.slice(0,more).map(s=><div className="cv-card" key={s.name+s.lat}>
        <a className="cv-card-main" data-gj-pt={`${s.lat},${s.lon}`} data-gj-name={s.name} href={s.sid?storePath(s.sid):`https://map.kakao.com/link/search/${encodeURIComponent(s.name)}`} {...(s.sid?{}:{target:'_blank',rel:'noopener'})}>
          <span className="cv-icon" aria-hidden="true">🏪</span>
          <span className="cv-card-body"><b>{s.name}</b>
            <small><span className="cv-km">{km(s.km)}</span>{pick.props.filter(p=>s.props.includes(p)).map(p=><span className="cv-tag" key={p}>{p}</span>)}</small>
            <small className="muted">{s.addr}</small></span></a>
        {s.tel&&<span className="cv-acts"><a href={telHref(s.tel)} aria-label={`${s.name} 전화`}>📞</a></span>}
      </div>)}</div>}
      {rows.length>more&&<button type="button" className="cv-more" onClick={()=>setMore(x=>x+10)}>더 보기 ({n(rows.length-more)}곳 남음)</button>}
      <p className="muted small">{note??<>GS25 앱에 매장이 등록한 서비스 기준이에요(비공식 안내). 파는 시간·남은 수량은 매장마다 달라 다 팔렸을 수 있으니, 가기 전에 📞 전화로 확인하세요. CU·세븐일레븐·이마트24는 이 정보를 받을 수 없어 보이지 않을 뿐, 파는 매장이 없다는 뜻은 아니에요.</>}</p>
    </>}
  </section>;
}
