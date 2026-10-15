'use client';
import Link from 'next/link';
import {dirLabel,roadName,type Route} from '../../lib/format';
import {useState} from 'react';
import {useMyPosition} from '@guidejung/ui/geo';
import {GRADE,fmtTime,useTraffic} from './live';
import {nearRests} from './HomeLists';
import type {RestLite} from './NearMe';

/** 메인 3초 답(전국 정체 구간 수)과 지금 가장 막히는 구간 TOP 10 — 위치를 알면 내 근처 노선부터(전국으로 바꿔 볼 수 있음). */
export function HomeLive({routes,rests}:{routes:Route[];rests:RestLite[]}){
  const {data,failed}=useTraffic();const {pos}=useMyPosition();const [wide,setWide]=useState(false);
  const near=nearRests(rests,pos);const nearNos=near?new Set(near.map(x=>x.r.routeNo)):null;const local=!!nearNos&&!wide;
  const byNo=new Map(routes.map(r=>[r.no,r]));
  if(failed)return <p className="notice" role="alert">실시간 소통 정보를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.</p>;
  if(!data)return <section className="tf-hero"><p className="tf-answer">전국 고속도로 <b>{routes.length}개 노선</b> 실시간 정체</p><p className="tf-sub" role="status">지금 막히는 구간을 찾고 있어요…</p></section>;
  const all=routes.flatMap(r=>(['E','S'] as const).flatMap(d=>r[d].map(([id,name])=>({id,name,r,d,v:data.zones[id]}))));
  const jam=all.filter(z=>z.v?.[1]===3),slow=all.filter(z=>z.v?.[1]===2);
  // With a position, the headline is about the roads around the visitor, not the whole country.
  const mine=local?all.filter(z=>nearNos!.has(z.r.no)):all;const mJam=mine.filter(z=>z.v?.[1]===3).length,mSlow=mine.filter(z=>z.v?.[1]===2).length;
  const top=[...jam,...slow].filter(z=>z.v![0]>0&&(!local||nearNos!.has(z.r.no))).sort((a,b)=>b.v![1]-a.v![1]||a.v![0]-b.v![0]).slice(0,10);
  // Routes ranked by how many 구간 are jammed or slow right now.
  const worst=[...byNo.values()].map(r=>({r,n:all.filter(z=>z.r===r&&(z.v?.[1]??0)>=2).length})).filter(x=>x.n).sort((a,b)=>b.n-a.n).slice(0,6);
  return <>
    <section className={`tf-hero${mJam?' jam':mSlow?' slow':''}`}>
      <p className="tf-answer">{local?<>{pos!.precise?'내 근처':'접속 위치 부근'} 고속도로 {mJam+mSlow?<>정체 <b>{mJam}곳</b> · 서행 <b>{mSlow}곳</b></>:<><b>원활</b>해요</>}</>:<>지금 전국 고속도로 정체 <b>{jam.length}곳</b> · 서행 <b>{slow.length}곳</b></>}</p>
      <p className="tf-sub">{local?`가까운 ${nearNos!.size}개 노선 기준 · 전국 정체 ${jam.length}곳`:`${routes.length}개 노선 ${all.length.toLocaleString()}개 구간`} · {fmtTime(data.time)} 기준{data.refreshing?' · 최신 정보 확인 중':''}</p>
    </section>
    {worst.length>0&&<div className="chips big">{worst.map(({r,n})=><Link key={r.no} href={`/road/${r.no}`}>{roadName(r)} <span className="tf-badge">막힘 {n}</span></Link>)}</div>}
    <section className="section"><div className="section-heading"><div><div className="eyebrow">TOP 10</div><h2>{local?(pos!.precise?'내 근처':'접속 위치 부근'):'전국'} 가장 막히는 구간</h2></div>{nearNos?<button type="button" className="chip" onClick={()=>setWide(!wide)}>{wide?'내 근처 보기':'전국 보기'}</button>:<Link href="/road">고속도로별 보기</Link>}</div>
      {top.length?<ol className="tf-top">{top.map((z,i)=><li key={z.id}><Link href={`/road/${z.r.no}#${z.id}`} className={`g${z.v![1]}`}>
        <span className="tf-rank">{i+1}</span><span className="tf-zname"><b>{z.name.replace('-',' → ')}</b><small>{roadName(z.r)} · {dirLabel(z.r,z.d)}</small></span>
        <span className="tf-speed"><b>{z.v![0]}</b>km/h<small>{GRADE[z.v![1]].text}</small></span></Link></li>)}</ol>
      :<p className="notice">{local?'내 근처 고속도로는 지금 막히는 구간이 없어요.':'지금 막히는 구간이 없어요. 전국 고속도로가 원활합니다.'}</p>}
    </section>
  </>;
}
