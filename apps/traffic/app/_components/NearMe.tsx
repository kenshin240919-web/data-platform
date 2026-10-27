'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {broadArea,LocateCard,PosNote,km,nearest,useMyPosition,here} from '@guidejung/ui/geo';
import {dirLabel,roadName,type Route} from '../../lib/format';
import type {Cctv} from '../../lib/types';
import {CctvPlayer,cctvName} from './CctvPlayer';
import {useCctv,useTraffic} from './live';
import {Speed,routeCctvs,segments} from './RouteLive';

export type RestLite={code:string;name:string;routeNo:string;route:string;area:string;lat:number;lng:number;dir:string;gas:string;food:string;foodCost:string};
const fmtKm=(d:number)=>d<1?`${Math.round(d*1000)}m`:`${d.toFixed(d<10?1:0)}km`;

/**
 * 메인 첫 화면: 내 위치(허용 전에는 접속 위치 부근) 기준 가까운 고속도로마다
 * 미니 노선도(내 위치 앞뒤 구간·양방향 속도)와 그 도로의 가까운 CCTV를 한 카드에, 그 아래 가까운 휴게소.
 */
export function NearMe({routes,rests,places}:{routes:Route[];rests:RestLite[];places:{code:string;charge:string;label:string;lat:number;lon:number}[]}){
  const {pos,status,request}=useMyPosition();const {data}=useTraffic();const cctv=useCctv();
  const [play,setPlay]=useState<{list:Cctv[];i:number}|null>(null);
  const near=useMemo(()=>pos?rests.map(r=>({r,d:km(here(pos).lat,here(pos).lon,r.lat,r.lng)})).sort((a,b)=>a.d-b.d):[],[pos,rests]);
  // Nearest roads by their own 구간 points (fallback: rest areas), each with the 구간 closest to me.
  const roads=useMemo(()=>{
    if(!pos)return [];
    const list=routes.map(r=>{const segs=segments(r);let k=-1,d=Infinity;segs.forEach((s,i)=>{if(!s.mid)return;const x=km(here(pos).lat,here(pos).lon,s.mid[0],s.mid[1]);if(x<d){d=x;k=i;}});
      if(k<0){const n=near.find(x=>x.r.routeNo===r.no);if(n)d=n.d+1;}return {r,segs,k,d};});
    return list.filter(x=>Number.isFinite(x.d)).sort((a,b)=>a.d-b.d).slice(0,3);
  },[pos,routes,near]);
  const area=pos?nearest(places,here(pos).lat,here(pos).lon):undefined;const place=pos&&!pos.precise?broadArea(places,here(pos).lat,here(pos).lon):area?.label;
  const where=pos?.precise?'내 근처':place?`${place} 부근`:'접속 위치 부근';
  return <section className="section tf-near">
    <PosNote/>{!pos?.precise&&<LocateCard title="내 근처 고속도로 상황 보기" desc="가까운 고속도로의 구간별 속도·CCTV·휴게소를 먼저 보여 드려요" status={status} onClick={request} approxLabel={place}/>}
    {pos&&<>
      <div className="section-heading"><div><div className="eyebrow">NEAR ME</div><h2>{where} 고속도로</h2></div></div>
      <div className="tf-near-roads">{roads.map(({r,segs,k,d})=>{
        // Without city names (e.g. 순환선), the directions are named after the ICs at both ends of this short window.
        const win=k>=0?segs.slice(Math.max(0,k-1),k+2):[];
        const cams=cctv.data?routeCctvs(cctv.data.items,r).map(c=>({c,d:km(here(pos).lat,here(pos).lon,c.lat,c.lng)})).filter(x=>x.d<=15).sort((a,b)=>a.d-b.d).slice(0,4):[];
        const camList=cams.map(x=>x.c);
        return <article key={r.no} className="tf-near-card">
          <header><div><h3>{roadName(r)}</h3><span className="muted small">{k>=0?`${segs[k].from} 부근 · ${fmtKm(d)}`:`${r.start} ↔ ${r.end}`}</span></div><Link href={`/road/${r.no}`} className="tf-near-more">노선 전체 →</Link></header>
          {win.length>0&&<table className="tf-table tf-mini"><thead><tr><th>구간</th><th>◀ {r.dirs?dirLabel(r,'S'):`${win[0].from} 방향`}</th><th>{r.dirs?dirLabel(r,'E'):`${win[win.length-1].to} 방향`} ▶</th></tr></thead>
            <tbody>{win.map(s=><tr key={s.i} className={s.i===k?'here':''}><td><b>{s.from}</b> → {s.to}{s.i===k&&<span className="tf-here">📍</span>}</td><td><Speed t={data} id={s.s} label=""/></td><td><Speed t={data} id={s.e} label=""/></td></tr>)}</tbody></table>}
          {cams.length>0&&<div className="tf-near-cams">{cams.map(({c,d},i)=><button key={c.url} type="button" className="tf-cam-btn" onClick={()=>setPlay({list:camList,i})}>📹 {cctvName(c)} <small>{fmtKm(d)}</small></button>)}</div>}
        </article>;})}</div>
      {area&&pos&&<div className="gj-connect tf-near-links"><h2>🔗 {area.label} 함께 보기</h2><div>
        <a href={`https://weather.guidejung.com/region/${area.code}`}><span className="gj-connect-icon" aria-hidden="true">🌤️</span><span><b>{area.label} 날씨</b><small>비·눈·특보 확인하고 출발</small></span><span className="gj-connect-go" aria-hidden="true">→</span></a>
        <a href={`https://charge.guidejung.com/region/${area.charge}`}><span className="gj-connect-icon" aria-hidden="true">⚡</span><span><b>{area.label} 전기차 충전소</b><small>지금 비어 있는 충전기</small></span><span className="gj-connect-go" aria-hidden="true">→</span></a>
        <a href={`https://trip.guidejung.com/search?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&radius_km=20`}><span className="gj-connect-icon" aria-hidden="true">🚗</span><span><b>{where} 가볼만한곳</b><small>20km 안 여행지·축제</small></span><span className="gj-connect-go" aria-hidden="true">→</span></a>
      </div></div>}
      <div className="section-heading"><h2>{where} 휴게소</h2><Link href="/rest">휴게소 전체</Link></div>
      <div className="tf-cards">{near.slice(0,3).map(({r,d})=><Link key={r.code} href={`/rest/${r.code}`} className="tf-card">
        <span className="tf-card-title">{fmtKm(d)}{r.dir?` · ${r.dir} 방향`:''}</span><strong>{r.name}</strong><small>{[r.food,r.gas&&`휘발유 ${r.gas}`].filter(Boolean).join(' · ')||'편의시설 보기'}</small></Link>)}</div>
    </>}
    {play&&<CctvPlayer list={play.list} index={play.i} onIndex={i=>setPlay({...play,i})} onClose={()=>setPlay(null)}/>}
  </section>;
}
