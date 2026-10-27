'use client';
// trip 메인 맨 위: 위치를 알면(이미 허용했거나, 접속 위치로 대략) 그 주변 20km의 가볼만한곳·맛집·숙소·축제부터 보여 준다.
// 정확한 위치는 카드를 눌러야 묻는다(packages/ui/src/geo.tsx). 위치는 브라우저 안에서만 쓰고 서버에는 검색 좌표만 간다.
import {useEffect,useState} from 'react';
import type {Place,Results} from './types';
import {Cards} from './cards';
import {broadArea,LocateCard,PosNote,useMyPosition,fixKmNow,here} from './geo';
import {todayKST} from './search';

const TABS=[['place','🏞️ 가볼만한곳'],['food','🍽️ 맛집'],['stay','🛏️ 숙소'],['festival','🎉 축제'],['shop','🛍️ 쇼핑'],['course','🧭 여행코스']] as const;
type Group={kind:string;items:Place[];total:number};

export function MyNearby({base=''}:{base?:string}){
  const {pos,status,request}=useMyPosition();
  const [groups,setGroups]=useState<{key:string;list:Group[]}|null>(null);
  const [tab,setTab]=useState<string|null>(null);
  const key=pos?`${pos.lat.toFixed(3)},${pos.lon.toFixed(3)}`:'';
  useEffect(()=>{
    if(!pos)return;let live=true;
    const today=todayKST(),soon=new Date(Date.now()+(9*3600+90*86400)*1000).toISOString().slice(0,10);
    const q=(kind:string)=>`${base}/api/search?lat=${pos.lat}&lon=${pos.lon}&radius_km=20&limit=8&kind=${kind}${kind==='festival'?`&date_from=${today}&date_to=${soon}`:''}`;
    Promise.all(TABS.map(([kind])=>fetch(q(kind)).then(r=>r.ok?r.json() as Promise<Results>:null).then(fixKmNow).then(r=>({kind,items:(r?.items??[]) as Place[],total:r?.total??0})).catch(()=>({kind,items:[],total:0}))))
      .then(list=>{if(live)setGroups({key,list});});
    return ()=>{live=false;};
  },[key,base]);  // eslint-disable-line react-hooks/exhaustive-deps
  const list=groups?.key===key?groups.list.filter(g=>g.items.length):null;
  const active=list?.find(g=>g.kind===tab)??list?.[0];
  const area=pos&&list?broadArea(list.flatMap(g=>g.items).filter(p=>p.latitude!=null).map(p=>({name:p.region_name,lat:p.latitude!,lon:p.longitude!})),here(pos).lat,here(pos).lon):undefined;
  const more=(kind:string)=>`${base}/search?lat=${pos!.lat}&lon=${pos!.lon}&radius_km=20&kind=${kind}`;
  return <section className="my-nearby" aria-label="내 주변 여행 정보">
    {pos&&<div className="section-heading"><div><div className="eyebrow">NEAR ME · 20KM</div><h2>{pos.precise?'📍 내 위치 주변 여행 정보':`📍 ${area?`${area} 부근`:'접속 위치 주변'} 여행 정보`}</h2></div>{active&&<a href={more(active.kind)}>모두 보기</a>}</div>}
    <PosNote/>{(!pos||!pos.precise)&&<LocateCard title={pos?'정확한 내 위치로 다시 찾기':'내 주변 20km 여행지·맛집·숙소'} desc="가까운 순으로 바로 보여 드려요" status={status} onClick={request} approxLabel={pos&&area?area:undefined}/>}
    {pos&&!list&&<div className="loading" role="status">주변 정보를 불러오고 있습니다.</div>}
    {list&&list.length===0&&<p className="notice">20km 안에 아직 등록된 정보가 없습니다. 아래에서 지역을 골라 보세요.</p>}
    {list&&active&&<><div className="near-labels" role="tablist">{list.map(g=><button key={g.kind} type="button" role="tab" aria-selected={g.kind===active.kind} className={`near-label${g.kind===active.kind?' on':''}`} onClick={()=>setTab(g.kind)}>{TABS.find(t=>t[0]===g.kind)![1]}<span>{Number(g.total).toLocaleString()}</span></button>)}</div>
      <div className="near-panel on"><Cards items={active.items} base={base}/>{active.total>active.items.length&&<a className="near-more" href={more(active.kind)}>{TABS.find(t=>t[0]===active.kind)![1].slice(3)} {Number(active.total).toLocaleString()}곳 모두 보기 →</a>}</div></>}
  </section>;
}

/** A main-page section that switches to the visitor's surroundings once their position is known (same position as
 * MyNearby; nearMore gets &lat=&lon= appended). Before that — and for search engines — it shows the nationwide cards (server items or `query`). */
export function LocalSection({eyebrow,title,nearTitle,more,nearMore,query,nearQuery,items,base=''}:{eyebrow:string;title:string;nearTitle:string;more:string;nearMore:string;query:Record<string,string|number>;nearQuery:Record<string,string|number>;items?:Place[];base?:string}){
  const {pos}=useMyPosition();
  const [data,setData]=useState<{key:string;items:Place[]}|null>(null);
  const near=!!pos;const key=pos?`${pos.lat.toFixed(3)},${pos.lon.toFixed(3)}`:'all';
  useEffect(()=>{
    if(!near&&items)return;let live=true;
    const q=new URLSearchParams(Object.entries(near?{...nearQuery,lat:pos!.lat,lon:pos!.lon}:query).map(([k,v])=>[k,String(v)]));
    fetch(`${base}/api/search?${q}`).then(r=>r.ok?r.json() as Promise<Results>:null).then(fixKmNow).then(r=>{
      // Nothing around the visitor: keep the nationwide cards rather than an empty section.
      if(live)setData({key,items:near&&!r?.items.length?(items??[]):(r?.items??[]) as Place[]});
    }).catch(()=>{});
    return ()=>{live=false;};
  },[key,base]);  // eslint-disable-line react-hooks/exhaustive-deps
  const shown=data?.key===key?data.items:(!near&&items)?items:null;
  const local=near&&data?.key===key&&shown!==items;
  return <section className="section"><div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{local?nearTitle:title}</h2></div><a href={local?`${nearMore}&lat=${pos!.lat}&lon=${pos!.lon}`:more}>모두 보기</a></div>
    {shown?<Cards items={shown} base={base}/>:<div className="loading" role="status">정보를 불러오고 있습니다.</div>}</section>;
}
