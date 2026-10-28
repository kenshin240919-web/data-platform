// 시장 상세·5일장 상세의 '장날' 칸(서버) — 다음 장날은 브라우저에서(JangNext).
import Link from 'next/link';
import {JangNext} from './Jang';
import {eun,jangDaysText,jangLabel,type Fair} from '../../lib/fmt';
export function JangInfo({f,name}:{f:Fair;name:string}){
  return <section id="jang"><h2>📅 장날 · {jangLabel(f)}</h2>
    <p className="mk-lead">{eun(name)} <b>{jangDaysText(f)}</b>에 장이 서요{f.mtype?`(${f.mtype})`:''}.{f.days?.includes(21)&&f.days.includes(26)?' 31일에도 장이 서는지는 시장마다 달라요.':''} 명절·날씨에 따라 쉬거나 바뀔 수 있으니 멀리서 가신다면 미리 확인하세요.</p>
    <JangNext days={f.days} wd={f.wd}/>
    <p><Link className="mk-more-link" href="/jang">오늘 장 서는 다른 5일장 보기 →</Link></p>
  </section>;
}
