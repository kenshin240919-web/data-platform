'use client';
// 보호 중인 아이들·실종 동물 카드(사진은 Worker /photo/{id}가 https로 대신 받아 줌). NearAnimals: 내 위치 주변부터(보호소 좌표 기준,
// 실종 동물은 시군구 중심 기준) 10→30→50→100km로 넓혀 12마리 이상. 개·고양이·기타 칩.
import {useEffect,useMemo,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow} from '@guidejung/ui/geo';
import {animalPath,animalTitle,ddayLabel,daysLeft,km,n,photoPath,type Animal} from '../../lib/fmt';

export function AnimalCard({a,lost}:{a:Animal&{km?:number};lost?:boolean}){
  const d=lost?null:daysLeft(a.until),label=lost?(a.lost?`${a.lost.slice(5).replace('-','/')} 실종`:null):ddayLabel(a.until);
  const body=<>
    <span className="pt-photo">{a.photo?<img src={photoPath(a.id)} alt={`${lost?'실종':'보호 중인'} ${a.kind??a.up??'동물'}`} loading="lazy" decoding="async" onError={e=>e.currentTarget.remove()}/>:<span aria-hidden="true">🐾</span>}
      {label&&<em className={d!=null&&d>=0&&d<=3?'soon':lost?'lost':''}>{label}</em>}</span>
    <span className="pt-animal-body"><b>{animalTitle(a)||'정보 확인 중'}</b>
      <small>{a.km!=null&&<span className="pt-km">{km(a.km)}</span>}{lost?a.where:(a.region_name+(a.color?` · ${a.color}`:''))}</small>
      {a.mark&&<small className="muted">{a.mark}</small>}</span></>;
  return lost?<div className="pt-animal lost">{body}</div>:<a className="pt-animal" href={animalPath(a.id)}>{body}</a>;
}
export function AnimalGrid({items,lost,limit=12}:{items:(Animal&{km?:number})[];lost?:boolean;limit?:number}){
  const ups=[...new Set(items.map(a=>a.up??'기타'))];
  const [up,setUp]=useState('');const [more,setMore]=useState(limit);
  const rows=useMemo(()=>items.filter(a=>!up||(a.up??'기타')===up),[items,up]);
  return <>
    {ups.length>1&&<div className="pt-chips" role="group" aria-label="동물 종류"><button type="button" className={!up?'pt-chip on':'pt-chip'} onClick={()=>{setUp('');setMore(limit);}}>전체 <small>{n(items.length)}</small></button>
      {ups.map(u=><button type="button" key={u} className={up===u?'pt-chip on':'pt-chip'} onClick={()=>{setUp(u);setMore(limit);}}>{u==='개'?'🐶':u==='고양이'?'🐱':'🐾'} {u} <small>{n(items.filter(a=>(a.up??'기타')===u).length)}</small></button>)}</div>}
    <div className="pt-animals">{rows.slice(0,more).map(a=><AnimalCard key={a.id} a={a} lost={lost}/>)}</div>
    {rows.length>more&&<button type="button" className="pt-more" onClick={()=>setMore(x=>x+limit)}>더 보기 ({n(rows.length-more)}마리 남음)</button>}
  </>;
}
type Res={total:number;items:(Animal&{km:number})[]};
export function NearAnimals({type='adopt',title}:{type?:'adopt'|'lost';title?:string}){
  const {pos,status,request}=useMyPosition();
  const [res,setRes]=useState<Res|null>(null);const [radius,setRadius]=useState(0);
  useEffect(()=>{if(!pos)return;let live=true;const steps=[10,30,50,100];
    const load=(i:number):Promise<void>=>fetch(`/api/animals?type=${type}&lat=${pos.lat.toFixed(3)}&lon=${pos.lon.toFixed(3)}&km=${steps[i]}`).then(x=>x.json()).then(fixKmNow).then((d:Res):Promise<void>|void=>{if(!live)return;
      if(d.total<12&&i<steps.length-1)return load(i+1);setRes(d);setRadius(steps[i]);});
    load(0).catch(()=>{if(live)setRes({total:0,items:[]});});return ()=>{live=false;};},[pos?.lat,pos?.lon,type]); // eslint-disable-line react-hooks/exhaustive-deps
  const lost=type==='lost';
  return <section className="pt-near-animals"><h2>{title??(lost?'🔎 내 주변 실종 동물':'🐾 내 주변 보호소에서 기다리는 아이들')}</h2>
    <PosNote/>{!pos?.precise&&<LocateCard title={lost?'내 위치 주변 실종 동물 보기':'내 위치 주변 보호 중인 아이들 보기'} desc="가까운 보호소부터 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!res&&<p className="muted">찾는 중…</p>}
    {res&&(res.total?<><p className="pt-answer">📍 {radius}km 안 {lost?'최근 30일 실종 신고':'보호 중'} <b>{n(res.total)}마리</b>{!lost&&(()=>{const s=res.items.filter(a=>{const d=daysLeft(a.until);return d!=null&&d>=0&&d<=3;}).length;return s?<> · 공고 마감 3일 안 <b>{n(s)}마리</b></>:null;})()}</p>
      <AnimalGrid items={res.items} lost={lost}/></>:<p className="muted">100km 안에 {lost?'실종 신고가':'보호 중인 아이가'} 없어요.</p>)}
  </section>;
}
