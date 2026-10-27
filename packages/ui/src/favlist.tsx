'use client';
// 첫 화면 맨 위 '⭐ 내 즐겨찾기': 상세에서 ☆로 저장한 곳(localStorage gj.fav)을 사이트 Worker /api/fav?ids= 로 지금 상태와 함께 보여 준다.
import {useEffect,useState} from 'react';
import type {FavInfo} from './actions';

type Fav={id:string;name:string;sub?:string;url:string};
type Live={id:string;state?:'open'|'soon'|'closed'|null;label?:string;line?:string};

/** 공유·즐겨찾기 버튼(정적 페이지용). 동작은 ACTIONS_JS(NetworkBar). */
/** go: 길찾기 버튼(카카오맵 link/to — 휴대폰에서는 live.ts가 카카오맵·네이버·T맵 고르기 창을 띄움). */
export function Actions({fav,go}:{fav?:FavInfo;go?:{name:string;lat:number;lon:number}}){
  return <div className="gj-actions">{go&&<a className="gj-go" href={`https://map.kakao.com/link/to/${encodeURIComponent(go.name)},${go.lat},${go.lon}`} target="_blank" rel="noopener">🧭 길찾기</a>}<button type="button" className="gj-kakao">💬 카카오톡 공유</button><button type="button" className="gj-share">📤 공유하기</button>
    {fav&&<button type="button" className="gj-fav" data-id={fav.id} data-name={fav.name} data-sub={fav.sub??''} data-url={fav.url}><span className="on">★ 즐겨찾기됨</span><span className="off">☆ 즐겨찾기</span></button>}</div>;
}

const read=():Fav[]=>{try{return JSON.parse(localStorage.getItem('gj.fav')??'[]');}catch{return [];}};

export function FavList({title='⭐ 내 즐겨찾기',hint}:{title?:string;hint?:string}){
  const [favs,setFavs]=useState<Fav[]>([]);const [live,setLive]=useState<Record<string,Live>>({});
  useEffect(()=>{const f=()=>setFavs(read());f();addEventListener('gj-fav',f);addEventListener('storage',f);return ()=>{removeEventListener('gj-fav',f);removeEventListener('storage',f);};},[]);
  useEffect(()=>{if(!favs.length)return;let on=true;
    fetch('/api/fav?ids='+encodeURIComponent(favs.map(f=>f.id).join(','))).then(r=>r.ok?r.json():null).then(d=>{if(on&&d?.items)setLive(Object.fromEntries((d.items as Live[]).map(x=>[x.id,x])));}).catch(()=>{});
    return ()=>{on=false;};},[favs]);
  if(!favs.length)return hint?<p className="gj-favs-hint">{hint}</p>:null;
  return <section className="gj-favs" aria-label="내 즐겨찾기"><h2>{title}</h2><div>{favs.map(f=>{const l=live[f.id];
    return <a key={f.id} href={f.url} className={`gj-fav-card ${l?.state??''}`}><b>{f.name}</b>{l?.label&&<small className="gj-fav-state">{l.label}</small>}<small>{l?.line||f.sub}</small></a>;})}</div></section>;
}
