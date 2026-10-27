'use client';
// 3초 답: 내 위치(이미 허용 → 정확, 아니면 접속 위치) 주변 온누리상품권 사용처 수와 가장 가까운 시장·상점가.
// 위치는 가게가 아니라 소속 시장·상점가 단위(원본에 가게 주소가 없음). 품목 칩을 누르면 그 품목 가게만.
// /api/near: 반경 안 시장(가까운 순)과 가맹점 수·품목별 수, cat이 있으면 그 품목 가게 목록.
import {useEffect,useState} from 'react';
import {LocateCard,PosNote,useMyPosition,fixKmNow,padKm,padLimit} from '@guidejung/ui/geo';
import {CAT_ORDER,CATS,km,marketPath,n,storePath,type Cat,type SlimMarket,type SlimStore} from '../../lib/fmt';
type Res={km:number;total:number;markets:SlimMarket[];cats:Partial<Record<Cat,number>>;stores:SlimStore[]};
export function NearMarket({cat:c0}:{cat?:Cat}){
  const {pos,status,request}=useMyPosition();
  const [cat,setCat]=useState<Cat|undefined>(c0);const [res,setRes]=useState<Res|null>(null);const [more,setMore]=useState(8);
  useEffect(()=>{if(!pos)return;let live=true;setRes(null);const ll=`lat=${pos.lat.toFixed(4)}&lon=${pos.lon.toFixed(4)}`;
    const steps=pos.precise?[1,2,3,5,10,20]:[3,5,10,20,30];
    // 서버엔 칸 중심만 가므로, 정확한 위치를 알면 반경·개수를 넓혀 받고 여기서 정확한 거리로 다시 자른다(합계·품목 수도 다시).
    const cut=(d:Res,k:number):Res=>{if(!pos.exact)return d;const ms=d.markets.filter(m=>m.km==null||m.km<=k);const cats:Partial<Record<Cat,number>>={};
      for(const m of ms)for(const [c,v] of Object.entries(m.cats??{}) as [Cat,number][])cats[c]=(cats[c]??0)+v;
      return {km:k,markets:ms,cats,total:ms.reduce((a,m)=>a+(cat?m.hit??0:m.n),0),stores:d.stores.filter(s=>s.km==null||s.km<=k)};};
    const load=(i:number):Promise<void>=>fetch(`/api/near?${ll}&km=${padKm(steps[i])}&mlimit=${padLimit(60,200)}&limit=${padLimit(300,600)}${cat?`&cat=${cat}`:''}`).then(x=>x.json()).then(fixKmNow).then((r:Res)=>cut(r,steps[i])).then((d:Res):Promise<void>|void=>{if(!live)return;
      if(d.markets.length<1&&i<steps.length-1)return load(i+1);setRes(d);setMore(8);});
    load(0).catch(()=>{if(live)setRes({km:0,total:0,markets:[],cats:{},stores:[]});});
    return ()=>{live=false;};},[pos?.lat,pos?.lon,pos?.precise,cat]); // eslint-disable-line react-hooks/exhaustive-deps
  const first=res?.markets[0];
  return <section className="mk-near">
    <PosNote/>{!pos?.precise&&<LocateCard title="내 주변 온누리상품권 사용처 보기" desc="가까운 전통시장·상점가 가맹점을 보여 드려요" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!res&&<p className="mk-answer muted">내 주변 찾는 중…</p>}
    {res&&<>
      <p className="mk-answer">{res.markets.length?<>📍 {pos?.precise?'내 주변':'접속 위치 주변'} {res.km}km 안 {cat?<>{CATS[cat].label} </>:''}온누리상품권 사용처 <b>{n(res.total)}곳</b> (시장·상점가 {n(res.markets.length)}곳)
        {first&&<> — 가장 가까운 곳 <a href={marketPath(first.id)}><b>{first.name}</b></a> {first.km!=null&&km(first.km)}</>}</>
        :<>📍 가까운 곳에서 찾지 못했어요. 지역별 목록에서 찾아보세요.</>}</p>
      <div className="mk-chips" role="group" aria-label="품목">
        <button type="button" className={!cat?'mk-chip on':'mk-chip'} onClick={()=>setCat(undefined)}>전체</button>
        {CAT_ORDER.filter(c=>c!=='etc').map(c=><button type="button" key={c} className={cat===c?'mk-chip on':'mk-chip'} aria-pressed={cat===c} onClick={()=>setCat(c)}>{CATS[c].icon} {CATS[c].label}{!cat&&res.cats[c]?<> <small>{n(res.cats[c]!)}</small></>:null}</button>)}
      </div>
      {cat&&res.stores.length>0&&<><h2 className="mk-list-title">{CATS[cat].icon} 가까운 {CATS[cat].label} 가맹점</h2>
        <ul className="mk-stores">{res.stores.slice(0,more*3).map(s=><li key={s.id}><a href={storePath(s.id)} data-gj-pt={s.lat!=null?`${s.lat},${s.lon}`:undefined} data-gj-name={s.market}><b>{s.name}</b>
          <small>{s.km!=null&&<span className="mk-km">{km(s.km)}</span>}{s.item??CATS[s.cat].label} · {s.market}</small></a></li>)}</ul>
        {res.stores.length>more*3&&<button type="button" className="mk-more" onClick={()=>setMore(x=>x+8)}>가게 더 보기</button>}</>}
      {res.markets.length>0&&<><h2 className="mk-list-title">🏪 가까운 시장·상점가</h2>
        <div className="mk-cards">{res.markets.slice(0,more).map(m=><a key={m.id} className="mk-card" href={marketPath(m.id)} data-gj-pt={m.lat!=null?`${m.lat},${m.lon}`:undefined} data-gj-name={m.name}>
          <span className="mk-icon" aria-hidden="true">🏪</span>
          <span className="mk-card-body"><b>{m.name}</b><small>{m.km!=null&&<span className="mk-km">{km(m.km)}</span>}{m.top.map(c=>CATS[c].label).join('·')}</small></span>
          <span className="mk-card-n"><b>{n(cat?m.hit??0:m.n)}</b><small>{cat?CATS[cat].label:'가맹점'}</small></span></a>)}</div>
        {res.markets.length>more&&!cat&&<button type="button" className="mk-more" onClick={()=>setMore(x=>x+8)}>시장 더 보기 ({n(res.markets.length-more)}곳 남음)</button>}</>}
    </>}
  </section>;
}
