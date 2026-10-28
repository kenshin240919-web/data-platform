'use client';
// 브라우저 쪽: 첫 화면 '우리 동네'(내 위치에서 가장 가까운 시군구 — 위치는 휴대폰 안에서만 쓰고 시군구 코드로만 요약을 받음),
// 맞춤 찾기(조건은 이 브라우저에만 저장), 검색. 목록은 정적 파일(/rows.json, /r/{시군구})이라 서버로 답이 가지 않는다.
import {useEffect,useMemo,useState} from 'react';
import {LocateCard,PosNote,here,useMyPosition} from '@guidejung/ui/geo';
import {BIZ,CODE_LABEL,FIELDS,FIELD_ORDER,HOUSE,INCOME,LIFE,benefitPath,dueLabel,kstToday,matches,n,openTo,won,type Ask,type Code,type Field,type Row} from '../../lib/fmt';

export type RegionLite={c:string;n:string;s:string;a:number;o:number};
let rowsP:Promise<Row[]>|null=null;
const loadRows=()=>rowsP??=fetch('/rows.json').then(r=>r.json() as Promise<Row[]>).catch(()=>{rowsP=null;return [];});
const nearestRegion=(regions:RegionLite[],lat:number,lon:number)=>regions.reduce((b,r)=>{const d=(r.a-lat)**2+((r.o-lon)*0.8)**2;return d<b.d?{r,d}:b;},{r:regions[0],d:1e9}).r;
const scopeChip=(key:string)=>key===''?'전국':/^\d/.test(key)?'우리 동네':`${key} 전체`;

export function RowItem({r,today}:{r:Row;today:string}){
  const [id,name,key,field,amount,due]=r;
  return <li><a className="bf-item" href={benefitPath(id)}><span aria-hidden="true">{FIELDS[field].icon}</span>
    <span className="bf-item-body"><b>{name}</b><small><span className="bf-scope">{scopeChip(key)}</span>{FIELDS[field].label}</small></span>
    <span className="bf-item-side">{amount?<span className="bf-money">최대 {won(amount)}</span>:null}{due?<span className={due<today?'bf-due past':'bf-due'}>{dueLabel(due,true,today)}</span>:null}</span></a></li>;
}

type Area={code:string;name:string;zone:string;sido:string;local:number;sidoN:number;nation:number;total:number;due:Row[];dueN:number;top:Row[]};
/** 첫 화면 3초 답: 📍 ○○구에서 받을 수 있는 혜택 N가지 — 한 달 안 마감 M건 */
export function MyArea({regions}:{regions:RegionLite[]}){
  const {pos,status,request}=useMyPosition();const [a,setA]=useState<Area|null>(null);const today=kstToday();
  useEffect(()=>{if(!pos)return;const p=here(pos);const r=nearestRegion(regions,p.lat,p.lon);let live=true;
    fetch(`/r/${r.c}`).then(x=>x.json()).then((d:Area)=>{if(live)setA(d);}).catch(()=>{});return ()=>{live=false;};},[pos?.lat,pos?.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  return <section className="bf-near">
    <PosNote/>{!pos?.precise&&<LocateCard title="우리 동네 혜택 보기" desc="내 위치로 사는 시군구를 찾아 받을 수 있는 혜택을 보여 드려요(위치는 휴대폰 안에서만 써요)" status={status} onClick={request} approxLabel={pos?'접속 지역':undefined}/>}
    {pos&&!a&&<p className="bf-answer muted">우리 동네 혜택 찾는 중…</p>}
    {a&&<>
      <p className="bf-answer">📍 <b>{a.name}</b>에서 받을 수 있는 혜택 <b>{n(a.total)}가지</b><br/>
        <small>{a.zone}만의 혜택 {n(a.local)} · {a.sido} 전체 {n(a.sidoN)} · 전국 {n(a.nation)}{a.dueN>0&&<> · 📅 한 달 안 마감 <b>{n(a.dueN)}건</b></>}</small></p>
      <div className="bf-chips"><a className="bf-chip on" href={`/find?r=${a.code}`}>🎯 나에게 맞는 것만 보기</a><a className="bf-chip" href={`/region/${a.code}`}>{a.name} 혜택 모두 보기 →</a></div>
      {a.due.length>0&&<><h2 className="bf-list-title">📅 곧 마감되는 우리 동네 혜택</h2><ul className="bf-list">{a.due.map(r=><RowItem key={r[0]} r={r} today={today}/>)}</ul></>}
      {a.top.length>0&&<><h2 className="bf-list-title">🏘️ {a.zone}에서 많이 찾는 혜택</h2><ul className="bf-list">{a.top.map(r=><RowItem key={r[0]} r={r} today={today}/>)}</ul></>}
    </>}
  </section>;
}

const STORE='gj.benefit';
type Saved={r?:string;age?:number|null;inc?:number|null;life?:Code[];house?:Code[];biz?:Code|null};
const read=():Saved=>{try{return JSON.parse(localStorage.getItem(STORE)??'{}');}catch{return {};}};
/** 맞춤 찾기: 사는 곳·나이·소득·상황 → 지원조건 코드로 맞는 혜택만(브라우저 안에서). */
export function Find({regions}:{regions:RegionLite[]}){
  const {pos}=useMyPosition();const today=kstToday();
  const [rows,setRows]=useState<Row[]|null>(null);
  const [r,setR]=useState('');const [age,setAge]=useState<number|null>(null);const [inc,setInc]=useState<number|null>(null);
  const [life,setLife]=useState<Code[]>([]);const [house,setHouse]=useState<Code[]>([]);const [biz,setBiz]=useState<Code|null>(null);
  const [field,setField]=useState<Field|null>(null);const [more,setMore]=useState(20);
  useEffect(()=>{loadRows().then(setRows);const s=read();const q=new URLSearchParams(location.search).get('r');
    if(q||s.r)setR(q??s.r!);if(s.age!=null)setAge(s.age);if(s.inc!=null)setInc(s.inc);setLife(s.life??[]);setHouse(s.house??[]);setBiz(s.biz??null);},[]);
  useEffect(()=>{if(!r&&pos){const p=here(pos);setR(nearestRegion(regions,p.lat,p.lon).c);}},[pos?.lat,pos?.lon]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{try{localStorage.setItem(STORE,JSON.stringify({r,age,inc,life,house,biz}));}catch{}},[r,age,inc,life,house,biz]);
  const reg=regions.find(x=>x.c===r);
  const ask:Ask={region:r||undefined,sido:reg?.s,age,inc,life,house,biz};
  // 고른 상황(임산부·다자녀…)을 콕 집은 혜택(일반인에겐 닫힌 것)을 먼저, 그다음 많이 찾는 순
  const aimed=(x:Row)=>(life.length&&!openTo(x[8],'JA0322')?1:0)+(house.length&&!openTo(x[8],'JA0410')?1:0);
  const hits=useMemo(()=>(rows??[]).filter(x=>matches(x,ask)).sort((a,b)=>aimed(b)-aimed(a)||b[10]-a[10]),[rows,r,age,inc,life,house,biz]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown=field?hits.filter(x=>x[3]===field):hits;
  const toggle=(list:Code[],set:(v:Code[])=>void,c:Code)=>set(list.includes(c)?list.filter(x=>x!==c):[...list,c]);
  const sidos=[...new Set(regions.map(x=>x.s))];
  return <section className="bf-find">
    <h2>🎯 나에게 맞는 혜택 찾기</h2><p className="muted small">고른 조건은 이 브라우저에만 저장돼요. 서버로 보내지 않아요.</p>
    <h3>1. 어디 사세요?</h3>
    <select aria-label="사는 시군구" value={r} onChange={e=>setR(e.target.value)}><option value="">시군구 고르기</option>
      {sidos.map(s=><optgroup key={s} label={s}>{regions.filter(x=>x.s===s).map(x=><option key={x.c} value={x.c}>{x.n}</option>)}</optgroup>)}</select>
    <h3>2. 받는 분 나이는요? <small className="muted">(아이 혜택이면 아이 나이)</small></h3>
    <input type="number" inputMode="numeric" min={0} max={120} aria-label="나이" placeholder="예: 34" value={age??''} onChange={e=>setAge(e.target.value===''?null:Math.max(0,Math.min(120,+e.target.value)))}/>
    <h3>3. 해당되는 것을 모두 골라 주세요 <small className="muted">(없으면 건너뛰기)</small></h3>
    <div className="bf-chips" role="group" aria-label="상황">{LIFE.map(c=><button type="button" key={c} className={life.includes(c)?'bf-chip on':'bf-chip'} aria-pressed={life.includes(c)} onClick={()=>toggle(life,setLife,c)}>{CODE_LABEL[c]}</button>)}</div>
    <div className="bf-chips" role="group" aria-label="가구">{HOUSE.map(c=><button type="button" key={c} className={house.includes(c)?'bf-chip on':'bf-chip'} aria-pressed={house.includes(c)} onClick={()=>toggle(house,setHouse,c)}>{CODE_LABEL[c]}</button>)}</div>
    <h3>4. 가구 소득 <small className="muted">(모르면 그대로 두세요)</small></h3>
    <div className="bf-chips" role="group" aria-label="소득"><button type="button" className={inc==null?'bf-chip on':'bf-chip'} onClick={()=>setInc(null)}>모름</button>
      {INCOME.map((c,k)=><button type="button" key={c} className={inc===k?'bf-chip on':'bf-chip'} aria-pressed={inc===k} onClick={()=>setInc(k)}>{CODE_LABEL[c]}</button>)}</div>
    <h3>가게를 하시나요? <small className="muted">(소상공인 지원만 보기)</small></h3>
    <div className="bf-chips" role="group" aria-label="소상공인"><button type="button" className={biz==null?'bf-chip on':'bf-chip'} onClick={()=>setBiz(null)}>아니요</button>
      {BIZ.map(c=><button type="button" key={c} className={biz===c?'bf-chip on':'bf-chip'} aria-pressed={biz===c} onClick={()=>setBiz(c)}>{CODE_LABEL[c]}</button>)}</div>
    {!rows?<p className="bf-answer muted">혜택 목록 불러오는 중…</p>:<>
      <p className="bf-answer">{reg?<><b>{reg.n}</b>에 사는 </>:''}이 조건으로 받을 수 있을지도 모르는 혜택 <b>{n(hits.length)}가지</b>{!r&&<><br/><small>사는 곳을 고르면 우리 동네 혜택까지 함께 보여 드려요.</small></>}</p>
      <div className="bf-chips" role="group" aria-label="분야"><button type="button" className={!field?'bf-chip on':'bf-chip'} onClick={()=>{setField(null);setMore(20);}}>전체 <small>{n(hits.length)}</small></button>
        {FIELD_ORDER.map(f=>{const k=hits.filter(x=>x[3]===f).length;return k?<button type="button" key={f} className={field===f?'bf-chip on':'bf-chip'} aria-pressed={field===f} onClick={()=>{setField(f);setMore(20);}}>{FIELDS[f].icon} {FIELDS[f].label} <small>{n(k)}</small></button>:null;})}</div>
      <ul className="bf-list">{shown.slice(0,more).map(x=><RowItem key={x[0]} r={x} today={today}/>)}</ul>
      {shown.length>more&&<button type="button" className="bf-more" onClick={()=>setMore(m=>m+20)}>더 보기 ({n(shown.length-more)}가지 남음)</button>}
      <p className="bf-warn">조건은 정부24에 등록된 ‘지원 대상’ 표시로 맞춘 것이라, 실제로는 소득·재산·거주 기간 같은 조건이 더 있을 수 있어요. 혜택을 눌러 자세한 조건을 꼭 확인하세요.</p>
    </>}
  </section>;
}

/** 혜택 이름 검색 */
export function Search(){
  const [rows,setRows]=useState<Row[]|null>(null);const [q,setQ]=useState('');const today=kstToday();
  useEffect(()=>{loadRows().then(setRows);setQ(new URLSearchParams(location.search).get('q')??'');},[]);
  const words=q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits=words.length&&rows?rows.filter(r=>{const t=r[1].toLowerCase();return words.every(w=>t.includes(w));}).sort((a,b)=>b[10]-a[10]).slice(0,60):[];
  return <section className="bf-search">
    <input type="search" aria-label="혜택 이름" placeholder="예: 출산, 청년 월세, 장수수당, 난방비" value={q} onChange={e=>{setQ(e.target.value);try{history.replaceState(null,'',`?q=${encodeURIComponent(e.target.value)}`);}catch{}}}/>
    {!rows?<p className="muted">불러오는 중…</p>:words.length===0?<p className="muted">혜택 이름의 한 낱말만 넣어도 찾아요.</p>:
      <><p className="muted small">{n(hits.length)}가지{hits.length===60?'(많이 찾는 순 60가지까지)':''}</p><ul className="bf-list">{hits.map(r=><RowItem key={r[0]} r={r} today={today}/>)}</ul></>}
  </section>;
}
