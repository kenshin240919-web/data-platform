'use client';
// 메인 3초 답: 내 주변 극장(가까운 순) + 가까운 극장 2곳의 '곧 시작하는 영화'(실시간, 비공식).
// 서버엔 약 2km 칸 중심만 보내고 거리는 휴대폰에서 다시 잼(fixKmNow).
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow,padLimit} from '@guidejung/ui/geo';
import {CHAINS,LIVE_CHAINS,km,kstHm,minDiff,n,seatTag,theaterPath,type ChainKey,type Show,type Slim} from '../../lib/fmt';
import {TheaterList} from './TheaterList';
type Res={total:number;items:Slim[]};
type Soon=Show&{t:Slim};
export function NearMovie({chain,drive}:{chain?:ChainKey;drive?:boolean}){
  const {pos,status,request}=useMyPosition();
  const [res,setRes]=useState<Res|null>(null);const [radius,setRadius]=useState(0);const [soon,setSoon]=useState<Soon[]|null|undefined>(undefined);
  useEffect(()=>{if(!pos)return;let live=true;
    const steps=pos.precise?[2,5,10,20,50]:[5,10,20,50];const lim=padLimit(60,300);
    const load=(i:number):Promise<void>=>fetch(`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=${steps[i]}&limit=${lim}${chain?`&chain=${chain}`:''}`).then(x=>x.json()).then(fixKmNow).then((d:Res):Promise<void>|void=>{if(!live)return;
      const inside=d.items.filter(p=>(p.km==null||p.km<=steps[i])&&(!drive||p.drive));
      if(inside.length<(drive?1:3)&&i<steps.length-1)return load(i+1);
      setRes({total:d.items.length<lim&&!drive?inside.length:drive?inside.length:Math.max(inside.length,d.total),items:inside});setRadius(steps[i]);
      // 곧 시작: 실시간을 받을 수 있는 가까운 극장 2곳(5km 안)
      const two=inside.filter(p=>LIVE_CHAINS.includes(p.chain)&&(p.km??0)<=5).slice(0,2);
      if(!two.length){setSoon(null);return;}
      const now=kstHm();
      Promise.all(two.map(t=>fetch('/api/showtimes?id='+t.id).then(r=>r.ok?r.json():null).catch(()=>null).then((x:{shows?:Show[]}|null)=>(x?.shows??[]).filter(s=>s.start>=now&&minDiff(now,s.start)<=120).map(s=>({...s,t})))))
        .then(all=>{if(live)setSoon(all.flat().sort((a,b)=>a.start.localeCompare(b.start)).slice(0,10));});
    });
    load(0).catch(()=>{if(live)setRes({total:0,items:[]});});
    return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,chain,drive]); // eslint-disable-line react-hooks/exhaustive-deps
  const first=res?.items[0];const label=drive?'자동차극장':chain?CHAINS[chain].label:'극장';
  return <section className="mv-near">
    <PosNote/>{!pos?.precise&&<LocateCard title={`내 위치 주변 ${label} 보기`} desc="가까운 순으로, 오늘 곧 시작하는 영화와 함께" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!res&&<p className="mv-answer muted">내 주변 찾는 중…</p>}
    {res&&<>
      <p className="mv-answer">{res.total?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {radius}km 안 {label} <b>{n(res.total)}곳</b>
          {first&&<>{' '}— 가장 가까운 <a href={theaterPath(first.id)}><b>{first.name}</b></a> {first.km!=null&&km(first.km)}</>}</>
          :<>📍 {radius}km 안에 {label}이 없어요. 지역 목록에서 찾아보세요.</>}</p>
      {soon===undefined&&res.items.some(p=>LIVE_CHAINS.includes(p.chain)&&(p.km??0)<=5)&&<p className="muted small">가까운 극장 상영 시간 확인 중…</p>}
      {soon&&soon.length>0&&<section className="mv-soon-box"><h2>⏰ 곧 시작하는 영화 <small className="muted">가까운 극장 2곳 · 2시간 안</small></h2>
        <ul className="mv-times">{soon.map((s,i)=>{const tag=seatTag(s);return <li key={i} className={s.left===0?'sold':''}><b>{s.start}</b><span>{s.movie}</span>
          <a className="muted small" href={theaterPath(s.t.id)}>{s.t.name}</a>{tag&&<em className={s.left===0?'mv-seat sold':'mv-seat'}>{tag}</em>}<em className="mv-soon">{minDiff(kstHm(),s.start)}분 뒤</em></li>;})}</ul>
        <p className="muted small">극장 앱 정보를 공개 중계로 받은 비공식 안내예요. 예매는 극장 공식 앱·누리집에서.</p></section>}
      {res.items.length>0&&<TheaterList items={res.items} limit={12} chain={chain}/>}
    </>}
  </section>;
}
