'use client';
// 영화 페이지의 '내 주변 오늘 상영': 가까운 CGV·롯데·메가박스 4곳(10km 안)의 오늘 남은 상영 중 이 영화만.
// 극장 앱 정보(aka.page, 비공식)라 KOBIS 칸과 따로 그리고 출처도 따로 붙임. 서버엔 칸 중심만(useMyPosition), 거리는 휴대폰에서.
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow,padLimit} from '@guidejung/ui/geo';
import {LIVE_CHAINS,km,kstHm,minDiff,seatTag,theaterPath,type Show,type Slim} from '../../lib/fmt';

const norm=(s:string)=>s.toLowerCase().replace(/[\s:：·,.!?'"“”‘’\-–—()[\]<>《》「」]/g,'');
/** 극장 앱의 영화 이름('위키드: 포 굿 (자막)')과 KOBIS 이름이 조금 달라서 앞부분 포함으로 맞춤 */
const same=(a:string,b:string)=>{const x=norm(a.replace(/\((자막|더빙|[234]D|IMAX|4DX|ScreenX|Dolby[^)]*)\)/gi,'')),y=norm(b);return !!x&&!!y&&(x.includes(y)||y.includes(x));};
type Hit=Show&{t:Slim};
export function FilmNear({name}:{name:string}){
  const {pos,status,request}=useMyPosition();
  const [hits,setHits]=useState<Hit[]|null|undefined>(undefined);const [th,setTh]=useState<Slim[]>([]);
  useEffect(()=>{if(!pos)return;let live=true;setHits(undefined);
    fetch(`/api/near?lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}&km=10&limit=${padLimit(40,300)}`).then(r=>r.json()).then(fixKmNow).then((d:{items:Slim[]})=>{
      const four=d.items.filter(p=>LIVE_CHAINS.includes(p.chain)&&(p.km??0)<=10).slice(0,4);if(!live)return;setTh(four);
      if(!four.length){setHits(null);return;}
      const now=kstHm();
      return Promise.all(four.map(t=>fetch('/api/showtimes?id='+t.id).then(r=>r.ok?r.json():null).catch(()=>null)
        .then((x:{shows?:Show[]}|null)=>(x?.shows??[]).filter(s=>s.start>=now&&same(s.movie,name)).map(s=>({...s,t})))))
        .then(all=>{if(live)setHits(all.flat().sort((a,b)=>a.start.localeCompare(b.start)));});
    }).catch(()=>{if(live)setHits(null);});
    return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,name]); // eslint-disable-line react-hooks/exhaustive-deps
  const now=kstHm();
  return <section className="mv-near" aria-label="내 주변 오늘 상영">
    <h2>📍 내 주변 오늘 ‘{name}’ 상영</h2>
    <PosNote/>{!pos?.precise&&<LocateCard title="내 주변 극장에서 찾기" desc="가까운 CGV·롯데시네마·메가박스 4곳의 오늘 남은 상영" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&hits===undefined&&<p className="mv-answer muted">가까운 극장 상영 시간 확인 중…</p>}
    {hits===null&&<p className="mv-answer">10km 안에 실시간 상영 시간을 받을 수 있는 극장이 없거나 불러오지 못했어요. <a href="/region">지역별 극장</a>에서 찾아보세요.</p>}
    {hits&&(hits.length?<>
      <p className="mv-answer">🎬 가까운 극장 {th.length}곳에서 오늘 남은 상영 <b>{hits.length}회</b>{hits[0]&&<> — 가장 빠른 {hits[0].start} <a href={theaterPath(hits[0].t.id)}>{hits[0].t.name}</a></>}</p>
      <ul className="mv-times">{hits.slice(0,20).map((s,i)=>{const tag=seatTag(s),m=minDiff(now,s.start);return <li key={i} className={s.left===0?'sold':''}><b>{s.start}</b><span>{s.t.name}{s.t.km!=null&&<small className="muted"> {km(s.t.km)}</small>}</span>
        {s.screen&&<small className="muted">{s.screen}</small>}{tag&&<em className={s.left===0?'mv-seat sold':'mv-seat'}>{tag}</em>}{m<=30&&m>=0&&<em className="mv-soon">{m}분 뒤</em>}</li>;})}</ul></>
      :<p className="mv-answer">가까운 극장 {th.length}곳({th.map(t=>t.name).join(', ')})에는 오늘 남은 ‘{name}’ 상영이 없어요.</p>)}
    {hits!==undefined&&<p className="muted small">극장 앱 정보를 공개 중계로 받은 비공식 안내예요(영화진흥위원회 자료가 아님). 예매는 극장 공식 앱·누리집에서 하세요.</p>}
  </section>;
}
