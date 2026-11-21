// KOBIS 박스오피스·영화 정보(apps/movie/data/kobis.json — scripts/collect-kobis.py가 배포 때 받음, 저장소에 없음). 서버 컴포넌트 전용.
// 11/22 영화진흥위원회 저장·게시 사전 승낙. 그래도 약관 제3조 ⑤·제6조 ⑤대로 다른 정보와 섞지 않은 칸에 두고 출처를 붙인다.
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';

export type Row={rank:number;inten:number;new:boolean;cd:string;name:string;open:string|null;audi:number;acc:number;scrn:number;show:number;share:number};
export type Day={date:string;rows:Row[]};
export type Week={end:string;range:string;rows:Row[]};
export type Film={cd:string;name:string;en:string|null;runtime:number|null;year:string|null;open:string|null;state:string|null;type:string|null;
  nations:string[];genres:string[];directors:string[];actors:{name:string;cast:string|null}[];grade:string|null;dist:string[];checked:string};
type K={updated_at:string;daily:Day[];weekly:Week[];weekend:Week[];films:Record<string,Film>};

const file=path.join(process.cwd(),'data/kobis.json');
const alt=path.join(process.cwd(),'apps/movie/data/kobis.json');
const D:K=(()=>{for(const f of [file,alt])if(existsSync(f))return JSON.parse(readFileSync(f,'utf-8')) as K;return {updated_at:'',daily:[],weekly:[],weekend:[],films:{}};})();

export const KOBIS_SRC='영화진흥위원회 통합전산망 오픈 API';
export const hasKobis=D.daily.length>0;
export const daily=D.daily;
export const latest=D.daily[0];
export const weekly=D.weekly;
export const weekend=D.weekend;
export const films=D.films;
export const film=(cd:string)=>D.films[cd];
/** 정적 페이지를 만들 영화: 영화 정보가 있는 것 */
export const filmList=Object.values(D.films);
/** '20261121' → '11월 21일' */
export const md=(d:string)=>`${+d.slice(4,6)}월 ${+d.slice(6,8)}일`;
const WD='일월화수목금토';
export const mdw=(d:string)=>`${md(d)}(${WD[new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T00:00:00Z`).getUTCDay()]})`;
/** '20261116~20261122' → '11월 16일~22일' */
export const rangeKo=(r:string)=>{const [a,b]=r.split('~');return a&&b?`${md(a)}~${a.slice(4,6)===b.slice(4,6)?`${+b.slice(6,8)}일`:md(b)}`:r;};
/** 영화 한 편의 저장된 날짜별 기록(최근 순) */
export const historyOf=(cd:string)=>D.daily.map(d=>({date:d.date,r:d.rows.find(x=>x.cd===cd)})).filter((x):x is {date:string;r:Row}=>!!x.r);
export const weeksOf=(cd:string,which:'weekly'|'weekend')=>(which==='weekly'?D.weekly:D.weekend).map(w=>({range:w.range,r:w.rows.find(x=>x.cd===cd)})).filter((x):x is {range:string;r:Row}=>!!x.r);
/** 영화 목록 정렬: 최근 일별 순위 → 누적 관객 */
export const lastRow=(cd:string)=>{for(const d of D.daily){const r=d.rows.find(x=>x.cd===cd);if(r)return {date:d.date,r};}return null;};
export const sortedFilms=()=>filmList.map(f=>({f,last:lastRow(f.cd)})).sort((a,b)=>(b.last?.date??'').localeCompare(a.last?.date??'')||(a.last?.r.rank??99)-(b.last?.r.rank??99));
export const filmPath=(cd:string)=>`/film/${cd}`;
/** '2026-11-05' 또는 '20261105' → '2026.11.5' */
export const dot=(s:string|null)=>{if(!s)return '';const t=s.replace(/-/g,'');return t.length===8?`${t.slice(0,4)}.${+t.slice(4,6)}.${+t.slice(6,8)}`:s;};
export const updatedKo=()=>{if(!D.updated_at)return '';const d=new Date(D.updated_at);return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;};
