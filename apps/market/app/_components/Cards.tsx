// Server-rendered cards (no hooks): market cards for lists, store rows for market/region pages.
import {CATS,km,marketPath,n,storePath,topCats,type Market,type StoreRow} from '../../lib/fmt';
import {fairOf,jangLabel} from '../../lib/data';
export function MarketCard({m,dist,hit,hitLabel}:{m:Market;dist?:number;hit?:number;hitLabel?:string}){
  const top=topCats(m.cats);const f=fairOf(m);
  return <a className="mk-card" href={marketPath(m.id)} data-gj-pt={m.geo==='std'||m.geo==='kakao'?`${m.lat},${m.lon}`:undefined} data-gj-name={m.name}>
    <span className="mk-icon" aria-hidden="true">🏪</span>
    <span className="mk-card-body"><b>{m.name}{f&&<span className="mk-tag">{jangLabel(f)}</span>}</b>
      <small>{dist!=null&&<span className="mk-km">{km(dist)}</span>}{m.region_name??m.sido}{top.length>0&&<> · {top.map(c=>CATS[c].label).join('·')}</>}</small></span>
    <span className="mk-card-n"><b>{n(hit??m.n)}</b><small>{hitLabel??'가맹점'}</small></span>
  </a>;
}
export function StoreRows({rows,market}:{rows:StoreRow[];market?:Market}){
  return <ul className="mk-stores">{rows.map(s=><li key={s[0]}><a href={storePath(s[0])}><b>{s[1]}</b>
    <small>{CATS[s[3]].icon} {s[4]??CATS[s[3]].label}{market?'':''}{s[5]?'':' · 지류만'}</small></a></li>)}</ul>;
}
