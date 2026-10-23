'use client';
import {useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {CenterList} from './CenterList';
import type {Slim} from '../../lib/fmt';
import {BRANDS} from '../../lib/brands';
// 가전·휴대폰 센터는 공공 데이터가 없어 검색 목록에 없음 → 브랜드·제품 이름이면 브랜드 안내(내 주변 센터)로 보냄.
const KEYS:Record<string,string[]>={samsung:['삼성','갤럭시','samsung','galaxy'],lg:['lg','엘지'],coway:['코웨이','coway'],cuckoo:['쿠쿠','cuckoo'],skmagic:['sk매직','에스케이매직','skmagic'],winia:['위니아','딤채','큐에이드','winia'],apple:['애플','아이폰','아이패드','맥북','에어팟','apple','iphone','ipad','macbook']};
const GOODS=['가전','휴대폰','핸드폰','스마트폰','냉장고','세탁기','건조기','에어컨','tv','티비','청소기','정수기','밥솥','노트북','김치냉장고','공기청정기','서비스센터'];
function brandsFor(q:string){const v=q.toLowerCase().replace(/\s+/g,'');if(!v)return [];const hit=BRANDS.filter(b=>(KEYS[b.slug]??[]).some(k=>v.includes(k)));return hit.length?hit:GOODS.some(g=>v.includes(g))?BRANDS:[];}
export function SearchBox(){
  const sp=useSearchParams();const [q,setQ]=useState(sp.get('q')??'');const [res,setRes]=useState<{total:number;items:Slim[]}|null>(null);
  useEffect(()=>{const v=q.trim();if(!v){setRes(null);return;}let live=true;const t=setTimeout(()=>fetch('/api/search?q='+encodeURIComponent(v)).then(r=>r.json()).then(d=>{if(live)setRes(d);}).catch(()=>{}),250);return ()=>{live=false;clearTimeout(t);};},[q]);
  return <>
    <form role="search" className="sv-search" onSubmit={e=>e.preventDefault()}><input type="search" value={q} onChange={e=>setQ(e.target.value)} placeholder="정비소·세차장 이름, 동네, 가전 브랜드 (예: 블루핸즈, 역삼동, 삼성)" aria-label="서비스센터 검색" autoComplete="off"/></form>
    {brandsFor(q).length>0&&<section className="sv-brand-hit"><h2 className="sv-list-title">📱 가전·휴대폰 서비스센터</h2><div className="sv-cards">{brandsFor(q).map(b=><a key={b.slug} className="sv-card" href={`/brand/${b.slug}`}><span className="sv-card-body"><b>{b.icon} {b.name}</b><small>{b.near?'내 주변 센터·대표번호·운영 시간':'대표번호·운영 시간'}</small></span></a>)}</div></section>}
    {res&&<><h2 className="sv-list-title">‘{q.trim()}’ 검색 결과 <span className="muted">{res.total.toLocaleString('ko-KR')}곳</span></h2><CenterList items={res.items} empty="맞는 곳이 없어요. 동네 이름으로도 찾아보세요."/></>}
  </>;
}
