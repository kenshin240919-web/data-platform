// 박스오피스 표(정적, KOBIS 결과만 — 상영 시간표·극장 정보와 섞지 않음). 출처 줄을 늘 함께 그림.
import Link from 'next/link';
import {n} from '../../lib/fmt';
import {dot,filmPath,films,KOBIS_SRC,type Row} from '../../lib/kobis';

export function BoxTable({rows,title,limit=10,note}:{rows:Row[];title:React.ReactNode;limit?:number;note?:string}){
  return <section className="mv-box" aria-label="박스오피스">
    <h2>{title}</h2>
    <ol className="mv-rank-box">{rows.slice(0,limit).map(r=><li key={r.cd||r.rank}><b>{r.rank}</b>
      <span>{films[r.cd]?<Link href={filmPath(r.cd)}>{r.name}</Link>:r.name}{r.new&&<em className="mv-new">NEW</em>}</span>
      <small>{n(r.audi)}명{!r.new&&r.inten!==0&&<> · {r.inten>0?`▲${r.inten}`:`▼${-r.inten}`}</>}<br/>누적 {n(r.acc)}명{r.open&&` · ${dot(r.open)} 개봉`}</small></li>)}</ol>
    <p className="muted small">출처: {KOBIS_SRC}{note?` · ${note}`:''}</p>
  </section>;
}
