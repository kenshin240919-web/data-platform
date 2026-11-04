import {CATS,span,type Round} from '../../lib/schedule';
/** 회차 표 — 접수 기간이 두 번 올라온 회차는 둘 다 적음 */
export function RoundTable({list}:{list:Round[]}){
  const C=CATS[list[0]?.cat??'gineungsa'];
  const hasP=list.some(x=>x.pr.length||x.pe||x.pp);
  return <div className="jb-tablewrap"><table className="jb-table jb-sctable"><thead><tr><th>회차</th><th>{C.written} 접수</th><th>{C.written} 시험</th><th>{C.written} 발표</th>
    {hasP&&<><th>{C.practical} 접수</th><th>{C.practical} 시험</th><th>최종 발표</th></>}</tr></thead>
    <tbody>{list.map(x=><tr key={x.id} id={x.id}><th>{x.y}년 {x.label}</th><td>{x.dr.map(span).join(', ')||'-'}</td><td>{span(x.de)||'-'}</td><td>{span([x.dp??null,null])||'-'}</td>
      {hasP&&<><td>{x.pr.map(span).join(', ')||'-'}</td><td>{span(x.pe)||'-'}</td><td>{span([x.pp??null,null])||'-'}</td></>}</tr>)}</tbody></table></div>;
}
