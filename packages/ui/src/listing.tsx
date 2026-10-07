'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import type {Params,Place,Region} from './types';
import {search,todayKST,type Query} from './search';
import {Cards,SearchForm,labels,value} from './cards';
import {AdSlot} from './ads';

let cache:Promise<Place[]>|null=null;
function loadIndex(){return cache??=fetch('/search-index.json').then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json();});}
function useIndex(){
  const [all,setAll]=useState<Place[]|null>(null),[failed,setFailed]=useState(false);
  useEffect(()=>{loadIndex().then(setAll,()=>{cache=null;setFailed(true);});},[]);
  return {all,failed};
}
const loading=<div className="loading" role="status">정보를 불러오고 있습니다.</div>;
const failure=<p className="notice" role="alert">정보를 불러오지 못했습니다. 새로고침해 주세요.</p>;

/** Cards for a fixed query, computed in the browser so date filters stay current. */
export function ClientCards({query,base=''}:{query:Query;base?:string}){
  const {all,failed}=useIndex();
  if(failed)return failure;
  return all?<Cards items={search(all,query).items} base={base}/>:loading;
}

export function Listing({fixed,regions,title}:{fixed:Query;regions:Region[];title:string}){
  const params=useSearchParams();
  const {all,failed}=useIndex();
  const effective:Params={...Object.fromEntries(params),...fixed as Params};
  const query=new URLSearchParams();
  for(const key of ['q','region','condition','kind','when','date_from','date_to','lat','lon','radius_km'])if(value(effective,key))query.set(key,value(effective,key));
  const region=regions.find(r=>r.id===value(effective,'region'));
  const results=all?search(all,{...Object.fromEntries(query),page:value(effective,'page')}):null;
  function pageUrl(page:number){const next=new URLSearchParams(query);next.set('page',String(page));return `/search?${next}`;}
  return <section className="section listing"><div className="eyebrow">FIND YOUR TRIP</div><h1>{region&&!fixed.region?`${region.name} 여행`:title}</h1><SearchForm compact regions={regions} params={effective} target="/search"/><div className="filter-links"><Link className={!value(effective,'condition')?'selected':''} href="/place">전체 장소</Link>{Object.entries(labels).map(([key,label])=><Link className={value(effective,'condition')===key?'selected':''} key={key} href={`/${key}${region?'?region='+region.id:''}`}>{label}</Link>)}<Link href="/weekend">이번 주말</Link></div>
    {failed?failure:!results?loading:<><div className="results-heading"><p><strong>{results.total}</strong>개 정보{value(effective,'q')&&<> · “{value(effective,'q')}”</>}</p><span className="muted small">{value(effective,'lat')?'직선거리순':'정보 충족도순'}</span></div><Cards items={results.items}/>{results.total>0&&<AdSlot/>}{results.pages>1&&<nav className="pagination" aria-label="검색 결과 페이지">{Array.from({length:Math.min(results.pages,30)},(_,i)=>i+1).map(p=><Link key={p} aria-current={p===results.page?'page':undefined} href={pageUrl(p)}>{p}</Link>)}</nav>}</>}</section>;
}

/** Event status text on detail pages, evaluated on the visitor's date rather than the build date. */
export function EventNote({end,demo}:{end?:string;demo:boolean}){
  const [ended,setEnded]=useState(false);
  useEffect(()=>{setEnded(!!end&&end<todayKST());},[end]);
  return <p>{demo?'가상의 예시 일정입니다.':ended?'종료된 행사입니다. 다음 회차 일정과 구분해 확인하세요.':'행사 일정은 주최기관 안내를 확인하세요.'}</p>;
}
