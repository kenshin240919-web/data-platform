// 국가자격 시험일정(한국산업인력공단 15074408 → scripts/collect-job.py → data/exam-schedule.json). 회차 단위(종목별 아님).
// 국가전문자격(S)은 API에 시험 이름이 없어('전문자격 (2026년도 63회 1차)') 싣지 않음 — 큐넷 링크만.
// 같은 이름·같은 시험 날짜인 줄은 한 회차로 합치고 접수 기간을 모음(자료에 접수 기간이 두 번 올라온 회차가 있음).
export type Range=[string|null,string|null];
export type Raw={y:number;gb:string;seq?:number;desc:string;dr?:Range;de?:Range;dp?:string;pr?:Range;pe?:Range;pp?:string};
export type Round={id:string;y:number;cat:Cat;label:string;dr:Range[];de?:Range;dp?:string;pr:Range[];pe?:Range;pp?:string};
export type Cat='gineungsa'|'gisa'|'gineungjang'|'gisulsa'|'course'|'worklearn';
export const CATS:Record<Cat,{name:string;icon:string;desc:string;written:string;practical:string}>={
  gineungsa:{name:'기능사',icon:'🔧',desc:'국가기술자격 기능사 — 지게차·굴착기·조리·미용·전기·용접 등',written:'필기',practical:'실기'},
  gisa:{name:'기사',icon:'📐',desc:'국가기술자격 기사 — 산업기사 일정은 큐넷에서 함께 확인하세요',written:'필기',practical:'실기'},
  gineungjang:{name:'기능장',icon:'🏅',desc:'국가기술자격 기능장',written:'필기',practical:'실기'},
  gisulsa:{name:'기술사',icon:'🎓',desc:'국가기술자격 기술사',written:'필기',practical:'면접'},
  course:{name:'과정평가형',icon:'📚',desc:'정해진 교육·훈련 과정을 마치고 평가로 받는 국가기술자격',written:'내부평가',practical:'외부평가'},
  worklearn:{name:'일학습병행',icon:'🏭',desc:'기업에서 일하며 배우는 일학습병행 과정의 자격',written:'평가',practical:'평가'},
};
export const CAT_ORDER:Cat[]=['gineungsa','gisa','gineungjang','gisulsa','course','worklearn'];
export const QNET_SCHEDULE='https://www.q-net.or.kr'; // 종목별 일정·접수는 큐넷에서(세부 주소는 확인 안 함)

function catOf(r:Raw):[Cat,string]|null{
  if(r.gb==='C')return ['course',r.desc.replace(/^\d{4}년\s*/,'').replace('과정평가형자격','').replace(/\s+/g,' ').trim()];
  if(r.gb==='W')return ['worklearn',r.desc.replace(/^\d{4}년\s*/,'').replace('일학습병행자격','').replace(/\s+/g,' ').trim()];
  if(r.gb!=='T')return null;
  const m=r.desc.match(/국가기술자격\s+(\S+)\s*\((\d{4})년도\s*(제\d+회)\)/);if(!m)return null;
  const c=m[1]==='기능사'?'gineungsa':m[1]==='기사'?'gisa':m[1]==='기능장'?'gineungjang':m[1]==='기술사'?'gisulsa':null;
  return c?[c,m[3]]:null;
}
const same=(a?:Range,b?:Range)=>(a?.[0]??'')===(b?.[0]??'')&&(a?.[1]??'')===(b?.[1]??'');
export function rounds(rows:Raw[]):Round[]{
  const out:Round[]=[];
  for(const r of rows){
    const c=catOf(r);if(!c)continue;
    const [cat,label]=c;
    const hit=out.find(x=>x.cat===cat&&x.y===r.y&&x.label===label&&same(x.de,r.de)&&same(x.pe,r.pe));
    if(hit){if(r.dr&&!hit.dr.some(d=>same(d,r.dr)))hit.dr.push(r.dr);if(r.pr&&!hit.pr.some(d=>same(d,r.pr)))hit.pr.push(r.pr);continue;}
    out.push({id:`${cat}-${r.y}-${out.length}`,y:r.y,cat,label,dr:r.dr?[r.dr]:[],de:r.de,dp:r.dp,pr:r.pr?[r.pr]:[],pe:r.pe,pp:r.pp});
  }
  for(const x of out){x.dr.sort((a,b)=>(a[0]??'').localeCompare(b[0]??''));x.pr.sort((a,b)=>(a[0]??'').localeCompare(b[0]??''));}
  return out.sort((a,b)=>first(a).localeCompare(first(b)));
}
const first=(x:Round)=>x.dr[0]?.[0]??x.pr[0]?.[0]??x.de?.[0]??x.pe?.[0]??'';

// ---- dates (문자열 YYYY-MM-DD로만 비교 — 한국 날짜) ----
export const kstToday=()=>new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
export const md=(d?:string|null)=>d?`${Number(d.slice(5,7))}/${Number(d.slice(8,10))}`:'';
const WD='일월화수목금토';
export const mdw=(d?:string|null)=>d?`${md(d)}(${WD[new Date(d+'T00:00:00Z').getUTCDay()]})`:'';
export const span=(r?:Range|null)=>!r||!r[0]?'':r[1]&&r[1]!==r[0]?`${md(r[0])}~${md(r[1])}`:md(r[0]);
export const days=(a:string,b:string)=>Math.round((Date.parse(b)-Date.parse(a))/864e5);

export type Ev={round:Round;what:'접수'|'시험'|'발표';stage:string;s:string;e:string};
/** 회차 하나의 날짜 묶음(필기 접수·필기 시험·필기 발표·실기 접수·실기 시험·최종 발표) */
export function events(x:Round):Ev[]{
  const C=CATS[x.cat],ev:Ev[]=[];
  for(const r of x.dr)if(r[0])ev.push({round:x,what:'접수',stage:`${C.written} 접수`,s:r[0],e:r[1]??r[0]});
  if(x.de?.[0])ev.push({round:x,what:'시험',stage:`${C.written} 시험`,s:x.de[0],e:x.de[1]??x.de[0]});
  if(x.dp)ev.push({round:x,what:'발표',stage:`${C.written} 합격 발표`,s:x.dp,e:x.dp});
  for(const r of x.pr)if(r[0])ev.push({round:x,what:'접수',stage:`${C.practical} 접수`,s:r[0],e:r[1]??r[0]});
  if(x.pe?.[0])ev.push({round:x,what:'시험',stage:`${C.practical} 시험`,s:x.pe[0],e:x.pe[1]??x.pe[0]});
  if(x.pp)ev.push({round:x,what:'발표',stage:x.pe?.[0]?'최종 합격 발표':'합격 발표',s:x.pp,e:x.pp});
  return ev;
}
/** 오늘 기준 묶음: 지금 접수 중 / 14일 안 접수 시작 / 7일 안 시험(진행 중 포함) / 7일 안 발표 */
export function board(list:Round[],today:string){
  const all=list.flatMap(events);
  const open=all.filter(e=>e.what==='접수'&&e.s<=today&&today<=e.e).sort((a,b)=>a.e.localeCompare(b.e));
  const soon=all.filter(e=>e.what==='접수'&&e.s>today&&days(today,e.s)<=14).sort((a,b)=>a.s.localeCompare(b.s));
  const exam=all.filter(e=>e.what==='시험'&&e.e>=today&&days(today,e.s)<=7).sort((a,b)=>a.s.localeCompare(b.s));
  const pass=all.filter(e=>e.what==='발표'&&e.s>=today&&days(today,e.s)<=7).sort((a,b)=>a.s.localeCompare(b.s));
  const next=all.filter(e=>e.what==='접수'&&e.s>today).sort((a,b)=>a.s.localeCompare(b.s))[0]??null;
  return {open,soon,exam,pass,next};
}
export const roundName=(x:Round)=>`${CATS[x.cat].name} ${x.y}년 ${x.label}`;
