// 공식 홈페이지 바로가기: 고용센터 홈페이지(고용24 '기관찾기'에 적힌 주소)·시도 일자리 누리집·고용24 기관찾기.
// 정적 페이지와 NearJob(브라우저)이 함께 씀 — 훅 없음. Worker 상세는 같은 모양을 worker/index.ts homeLinksHtml로.
import {homeLinks,LINKS} from '../../lib/fmt';
export function HomeLinks({center,region,find=true}:{center?:{name:string;hp?:string|null}|null;region?:string|null;find?:boolean}){
  const l=homeLinks(center,region);
  if(!l.length&&!find)return null;
  return <div className="jb-hp">{l.map(([t,u])=><a key={u} href={u} rel="noopener" target="_blank">🏠 {t} ↗</a>)}
    {find&&<a className="sub" href={LINKS.w24find} rel="noopener" target="_blank">🔎 고용24 기관찾기 ↗</a>}</div>;
}
